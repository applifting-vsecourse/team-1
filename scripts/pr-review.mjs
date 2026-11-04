#!/usr/bin/env node
// Keeps a local agent in step with the Codex code review of its PR (ChatGPT Codex,
// GitHub app `chatgpt-codex-connector`, rules in AGENTS.md).
// Usage: node scripts/pr-review.mjs wait <pr>    wait for the review of the PR's head commit
//        node scripts/pr-review.mjs stop-hook    Claude Code Stop hook (.claude/settings.json)
//
// Codex keeps one summary comment on the PR with a machine-readable state
// (`<!-- codex-review-state:v1 {...} -->`: reviewed commit, status, findings), so a
// review of an earlier push never counts. Codex reviews on its own only when a PR is
// opened or marked ready, not on a push, so `wait` asks for a review of a new head
// commit with an `@codex review` comment. An answer to a review is a PR comment that
// starts with `<!-- ai-review-answer: <sha> -->`.
import { execFileSync } from "node:child_process"
import fs from "node:fs"

const BOT = "chatgpt-codex-connector"
const TRIGGER = "@codex review"
const POLL_MS = Number(process.env.PR_REVIEW_POLL_MS ?? 20_000)
// How long to wait for an automatic review (PR just opened or marked ready) before asking.
const GRACE_MS = Number(process.env.PR_REVIEW_GRACE_MS ?? 60_000)
const TIMEOUT_MS = Number(process.env.PR_REVIEW_TIMEOUT_MS ?? 20 * 60_000)

const gh = (...args) =>
  execFileSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()

const ghJson = (...args) => JSON.parse(gh(...args) || "null")

// Every page of a REST list: `--slurp` wraps the pages in one outer array.
const ghList = (endpoint) => ghJson("api", endpoint, "--paginate", "--slurp").flat()

const answerMarker = (sha) => `<!-- ai-review-answer: ${sha} -->`

// REST says `chatgpt-codex-connector[bot]`, GraphQL (`gh pr view`) drops the suffix.
const isBot = (login = "") => login.replace(/\[bot\]$/, "") === BOT

// `**<sub><sub>![P1 Badge](…)</sub></sub> Title**\n\nDetails` → `P1`, `Title`
const finding = (c) => {
  const first = c.body.split("\n").find((l) => l.trim()) ?? ""
  const priority = c.body.match(/\bP([0-3])\b/)?.[0] ?? "P?"
  // The title follows the badge; cut it out instead of stripping markup (output is plain text).
  const title = first.split("</sub>").at(-1).replaceAll("**", "").trim()
  const where = c.line ?? c.original_line
  return `${priority} ${c.path}${where ? `:${where}` : ""} — ${title}`
}

const STATE = /<!-- codex-review-state:v1 (\{.*\}) -->/
const RUNNING = new Set(["running", "queued", "pending", "in_progress"])

// The `code_review` part of the state in Codex's summary comment, if there is one.
const codexState = (comments) => {
  const summary = comments.findLast((c) => isBot(c.author?.login) && STATE.test(c.body))
  if (!summary) return undefined
  try {
    return JSON.parse(summary.body.match(STATE)[1]).code_review
  } catch {
    return undefined
  }
}

// `pr` undefined means the PR of the current branch; gh fails when there is none.
const inspect = (pr) => {
  const view = ghJson(
    "pr",
    "view",
    ...(pr ? [pr] : []),
    "--json",
    "number,state,isDraft,headRefOid,comments,commits",
  )
  const head = view.headRefOid
  const sha = head.slice(0, 7)
  const number = String(view.number)
  // Only for the stop hook: is the head commit recent enough that its review may be coming?
  const since = Date.parse(view.commits.at(-1)?.committedDate ?? 0)
  const base = { number, sha, since, findings: [] }
  if (view.state !== "OPEN" || view.isDraft) return { ...base, state: "SKIPPED" }

  const answered = view.comments.some((c) => c.body.startsWith(answerMarker(sha)))

  // Only the commit in Codex's own state ties a review to the head; comment times don't
  // (a commit made before a review and pushed after it is older than that review).
  const review = codexState(view.comments)
  if (review?.commit_sha !== head) return { ...base, state: "MISSING" }
  if (RUNNING.has(review.status)) return { ...base, state: "PENDING" }
  if (review.has_any_findings === false) return { ...base, state: "CLEAN" }
  if (review.has_any_findings !== true) return { ...base, state: "FAILED", summary: review.status }

  const reviews = ghList(`repos/{owner}/{repo}/pulls/${number}/reviews?per_page=100`)
  const findings = reviews
    .filter((r) => isBot(r.user?.login) && r.commit_id === head)
    .flatMap((r) =>
      ghList(`repos/{owner}/{repo}/pulls/${number}/reviews/${r.id}/comments?per_page=100`),
    )
    .map(finding)
  return { ...base, state: answered ? "ANSWERED" : "REVIEWED", findings }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const report = ({ state, sha, findings, summary }) => {
  console.log(`commit: ${sha}`)
  if (summary) console.log(`\n${summary}\n`)
  for (const f of findings ?? []) console.log(f)
  if (state === "REVIEWED") {
    console.log(
      `\nAnswer every finding in one new PR comment that starts with \`${answerMarker(sha)}\`` +
        " (CLAUDE.md, Review). Also go through „Pozor“ in „Co se změnilo“.",
    )
  }
  console.log(`VERDICT: ${state}`)
}

const wait = async (pr) => {
  const start = Date.now()
  let asked = false
  for (;;) {
    const elapsed = Date.now() - start
    const result = await Promise.resolve()
      .then(() => inspect(pr))
      // A network hiccup while polling is not an answer; the timeout still ends the loop.
      .catch((error) => ({ state: "PENDING", sha: "?", error }))

    if (result.state !== "PENDING" && result.state !== "MISSING") return report(result)
    if (result.state === "MISSING" && !asked && elapsed >= GRACE_MS) {
      try {
        gh("pr", "comment", pr, "--body", TRIGGER)
        asked = true
      } catch (error) {
        // Try again on the next poll; the timeout still ends the loop with a verdict.
        result.error = error
      }
    }
    if (elapsed >= TIMEOUT_MS) {
      if (result.error) console.error(result.error.message)
      return report({ ...result, state: "TIMEOUT" })
    }
    await sleep(POLL_MS)
  }
}

// Fails open: anything unexpected lets the agent stop, this hook must never trap it.
const stopHook = () => {
  try {
    const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}")
    if (input.stop_hook_active) return

    const { state, sha, since } = inspect()
    // A recent head commit without a review yet: the review is on its way or not asked for.
    // An old one was most likely never reviewed (Codex off, PR before Codex): don't trap.
    const recent = Date.now() - since < TIMEOUT_MS

    if (state === "REVIEWED") {
      block(
        `The Codex review of ${sha} has findings without an answer. Run ` +
          "`node scripts/pr-review.mjs wait <pr>`, fix what it rightly finds and answer it.",
      )
    } else if (state === "PENDING" || (state === "MISSING" && recent)) {
      block(
        `The Codex review of ${sha} has not finished. Run ` +
          "`node scripts/pr-review.mjs wait <pr>` in the background and act on its verdict.",
      )
    }
  } catch {
    // No gh, no PR on this branch, no network: nothing to enforce.
  }
}

const block = (reason) => console.log(JSON.stringify({ decision: "block", reason }))

const [command, pr] = process.argv.slice(2)
if (command === "wait" && /^\d+$/.test(pr ?? "")) await wait(pr)
else if (command === "stop-hook") stopHook()
else {
  console.error("Usage: pr-review.mjs wait <pr> | stop-hook")
  process.exitCode = 2
}
