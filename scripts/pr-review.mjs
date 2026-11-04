#!/usr/bin/env node
// Keeps a local agent in step with the Codex code review of its PR (ChatGPT Codex,
// GitHub app `chatgpt-codex-connector`, rules in AGENTS.md).
// Usage: node scripts/pr-review.mjs wait <pr>    wait for the review of the PR's head commit
//        node scripts/pr-review.mjs stop-hook    Claude Code Stop hook (.claude/settings.json)
//
// A Codex review names the commit it reviewed (`commit_id`), so a review of an earlier
// push never counts. When no review of the head commit shows up within the grace period,
// `wait` asks for one with an `@codex review` comment. An answer to a review is a PR
// comment that starts with `<!-- ai-review-answer: <sha> -->`.
import { execFileSync } from "node:child_process"
import fs from "node:fs"

const BOT = "chatgpt-codex-connector"
const TRIGGER = "@codex review"
const POLL_MS = Number(process.env.PR_REVIEW_POLL_MS ?? 20_000)
// How long to wait for an automatic review before asking for one.
const GRACE_MS = Number(process.env.PR_REVIEW_GRACE_MS ?? 180_000)
const TIMEOUT_MS = Number(process.env.PR_REVIEW_TIMEOUT_MS ?? 20 * 60_000)

const gh = (...args) =>
  execFileSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()

const ghJson = (...args) => JSON.parse(gh(...args) || "null")

const answerMarker = (sha) => `<!-- ai-review-answer: ${sha} -->`

// REST says `chatgpt-codex-connector[bot]`, GraphQL (`gh pr view`) drops the suffix.
const isBot = (login = "") => login.replace(/\[bot\]$/, "") === BOT

// `**<sub><sub>![P1 Badge](…)</sub></sub> Title**\n\nDetails` → `P1`, `Title`
const finding = (c) => {
  const first = c.body.split("\n").find((l) => l.trim()) ?? ""
  const priority = c.body.match(/\bP([0-3])\b/)?.[0] ?? "P?"
  const title = first
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*/g, "")
    .trim()
  const where = c.line ?? c.original_line
  return `${priority} ${c.path}${where ? `:${where}` : ""} — ${title}`
}

// Codex says in a plain comment when it found nothing (or couldn't run); the exact
// wording isn't documented, so anything not clearly „no issues“ counts as a failure.
const looksClean = (body) => /didn.t find|no (major )?issues|looks good|🚀|👍/i.test(body)

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
  // Comments older than the head commit belong to an earlier push.
  const since = Date.parse(view.commits.at(-1)?.committedDate ?? 0)
  const base = { number, sha, since, findings: [] }
  if (view.state !== "OPEN" || view.isDraft) return { ...base, state: "SKIPPED" }

  const fresh = view.comments.filter((c) => Date.parse(c.createdAt) >= since)
  const answered = view.comments.some((c) => c.body.startsWith(answerMarker(sha)))
  const requested = fresh.some((c) => c.body.trim().startsWith(TRIGGER))

  const reviews = ghJson("api", `repos/{owner}/{repo}/pulls/${number}/reviews?per_page=100`)
  const review = reviews.findLast((r) => isBot(r.user?.login) && r.commit_id === head)
  if (review) {
    const comments = ghJson(
      "api",
      `repos/{owner}/{repo}/pulls/${number}/reviews/${review.id}/comments?per_page=100`,
    )
    const findings = comments.map(finding)
    const state = findings.length === 0 ? "CLEAN" : answered ? "ANSWERED" : "REVIEWED"
    return { ...base, state, findings, summary: review.body }
  }

  const note = fresh.findLast((c) => isBot(c.author?.login))
  if (note)
    return { ...base, state: looksClean(note.body) ? "CLEAN" : "FAILED", summary: note.body }

  return { ...base, state: requested ? "PENDING" : "MISSING" }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const report = ({ state, sha, findings, summary }) => {
  console.log(`commit: ${sha}`)
  if (summary) console.log(`\n${summary.trim()}\n`)
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
      gh("pr", "comment", pr, "--body", TRIGGER)
      asked = true
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
    const recent = Date.now() - since < TIMEOUT_MS

    if (state === "REVIEWED") {
      block(
        `The Codex review of ${sha} has findings without an answer. Run ` +
          "`node scripts/pr-review.mjs wait <pr>`, fix what it rightly finds and answer it.",
      )
    } else if ((state === "PENDING" || state === "MISSING") && recent) {
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
