#!/usr/bin/env node
// Keeps a local agent in step with the AI review of its PR (.github/workflows/ai-review.yml).
// Usage: node scripts/pr-review.mjs wait <pr>    wait for the review of the PR's head commit
//        node scripts/pr-review.mjs stop-hook    Claude Code Stop hook (.claude/settings.json)
//
// The review comment names the commit it reviewed (scripts/ai-review-comment.sh), so a
// stale comment from an earlier push never counts. An answer to a review is a PR comment
// that starts with `<!-- ai-review-answer: <sha> -->`.
import { execFileSync } from "node:child_process"
import fs from "node:fs"

const WORKFLOW = "ai-review.yml"
const REVIEW_MARKER = "<!-- ai-review -->"
const POLL_MS = Number(process.env.PR_REVIEW_POLL_MS ?? 20_000)
// How long a just-pushed commit may go without a run or a comment before we call it skipped.
const GRACE_MS = Number(process.env.PR_REVIEW_GRACE_MS ?? 120_000)
const TIMEOUT_MS = Number(process.env.PR_REVIEW_TIMEOUT_MS ?? 20 * 60_000)

const gh = (...args) =>
  execFileSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()

const answerMarker = (sha) => `<!-- ai-review-answer: ${sha} -->`

// `pr` undefined means the PR of the current branch; gh fails when there is none.
const inspect = (pr) => {
  const view = JSON.parse(
    gh("pr", "view", ...(pr ? [pr] : []), "--json", "state,isDraft,headRefOid,comments"),
  )
  const sha = view.headRefOid.slice(0, 7)
  const base = { sha, runs: [], review: undefined }
  if (view.state !== "OPEN" || view.isDraft) return { ...base, state: "SKIPPED" }

  const runs = JSON.parse(
    gh(
      "run",
      "list",
      "--workflow",
      WORKFLOW,
      "--commit",
      view.headRefOid,
      "--json",
      "status,createdAt",
    ),
  )
  const review = view.comments.find(
    (c) => c.body.startsWith(REVIEW_MARKER) && c.body.includes(`commit \`${sha}\``),
  )?.body
  const answered = view.comments.some((c) => c.body.startsWith(answerMarker(sha)))

  const state = (() => {
    if (runs.some((r) => r.status !== "completed")) return "PENDING"
    if (!review) return "MISSING"
    if (review.includes("AI review nedoběhlo")) return "FAILED"
    if (!/^### /m.test(review)) return "CLEAN"
    return answered ? "ANSWERED" : "REVIEWED"
  })()
  return { ...base, state, runs, review }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const report = ({ state, sha, review }) => {
  console.log(`commit: ${sha}`)
  if (review) console.log(`\n${review}\n`)
  if (state === "REVIEWED") {
    console.log(
      `Answer every finding in one new PR comment that starts with \`${answerMarker(sha)}\`` +
        " (CLAUDE.md, Review). Also go through „Pozor“ in „Co se změnilo“.",
    )
  }
  console.log(`VERDICT: ${state}`)
}

const wait = async (pr) => {
  const start = Date.now()
  for (;;) {
    const elapsed = Date.now() - start
    const result = await Promise.resolve()
      .then(() => inspect(pr))
      // A network hiccup while polling is not an answer; the timeout still ends the loop.
      .catch((error) => ({ state: "PENDING", sha: "?", error }))

    const settled = result.state !== "PENDING" && result.state !== "MISSING"
    if (settled) return report(result)
    if (result.state === "MISSING" && elapsed >= GRACE_MS)
      return report({ ...result, state: "SKIPPED" })
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

    const { state, sha, runs } = inspect()
    const newest = Math.max(0, ...runs.map((r) => Date.parse(r.createdAt)))
    const running = state === "PENDING" && Date.now() - newest < TIMEOUT_MS
    // No run at all for the head commit: the push is too fresh for Actions to show it.
    const justPushed = state === "MISSING" && runs.length === 0

    if (state === "REVIEWED") {
      block(
        `The AI review of ${sha} has findings without an answer. Run ` +
          "`node scripts/pr-review.mjs wait <pr>`, fix what it rightly finds and answer it.",
      )
    } else if (running || justPushed) {
      block(
        `The AI review of ${sha} has not finished. Run ` +
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
