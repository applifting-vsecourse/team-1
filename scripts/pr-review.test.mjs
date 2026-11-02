// Runs scripts/pr-review.mjs as a process against a fake `gh`. Run: pnpm test:scripts
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, it } from "node:test"

const SCRIPT = path.join(import.meta.dirname, "pr-review.mjs")
const SHA = "abc1234def0000000000000000000000000000ff"

// Serves the prepared JSON; a missing pr.json behaves like a branch without a PR.
const FAKE_GH = `#!/usr/bin/env bash
case "$1" in
  pr) [ -f "$FAKE_GH_DIR/pr.json" ] || { echo "no pull requests found" >&2; exit 1; }
      cat "$FAKE_GH_DIR/pr.json" ;;
  run) cat "$FAKE_GH_DIR/runs.json" ;;
esac
`

const review = (commit, content = "") => ({
  body: `<!-- ai-review -->\n> **AI review**\n${content}\n<sub>Model \`s\` · commit \`${commit}\`</sub>`,
})
const FINDINGS = review("abc1234", "\n### ⚠️ Varování\n\n| Kde | Co |")
const CLEAN = review("abc1234")
const NOT_FINISHED = review("abc1234", "> **AI review nedoběhlo.**")
const ANSWER = { body: "<!-- ai-review-answer: abc1234 -->\nopraveno v abc1234" }

const pr = (overrides = {}) => ({
  state: "OPEN",
  isDraft: false,
  headRefOid: SHA,
  comments: [],
  ...overrides,
})
const run = (status, age = 0) => ({
  status,
  createdAt: new Date(Date.now() - age).toISOString(),
})
const HOUR = 3_600_000
const DONE = [run("completed", HOUR)]

describe("pr-review", () => {
  let dir

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-review-"))
    fs.writeFileSync(path.join(dir, "gh"), FAKE_GH, { mode: 0o755 })
  })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  const givenGithub = (prData, runs = []) => {
    if (prData) fs.writeFileSync(path.join(dir, "pr.json"), JSON.stringify(prData))
    fs.writeFileSync(path.join(dir, "runs.json"), JSON.stringify(runs))
  }

  const env = (extra = {}) => ({
    ...process.env,
    PATH: `${dir}:${process.env.PATH}`,
    FAKE_GH_DIR: dir,
    ...extra,
  })

  const wait = () => {
    const timing = {
      PR_REVIEW_POLL_MS: "10",
      PR_REVIEW_GRACE_MS: "50",
      PR_REVIEW_TIMEOUT_MS: "200",
    }
    return spawnSync("node", [SCRIPT, "wait", "7"], { env: env(timing), encoding: "utf8" })
  }

  const stopHook = (input = "{}", processEnv = env()) =>
    spawnSync("node", [SCRIPT, "stop-hook"], { env: processEnv, input, encoding: "utf8" })

  const assertVerdict = (verdict) => {
    const { stdout, status } = wait()
    assert.equal(status, 0)
    assert.match(stdout, new RegExp(`^VERDICT: ${verdict}$`, "m"))
  }

  const assertBlocked = (expected, input) => {
    const { stdout, status } = stopHook(input)
    assert.equal(status, 0)
    if (expected) assert.equal(JSON.parse(stdout).decision, "block")
    else assert.equal(stdout, "")
  }

  describe("wait", () => {
    const verdicts = [
      ["findings without an answer", pr({ comments: [FINDINGS] }), DONE, "REVIEWED"],
      ["findings with an answer", pr({ comments: [FINDINGS, ANSWER] }), DONE, "ANSWERED"],
      ["no findings", pr({ comments: [CLEAN] }), DONE, "CLEAN"],
      ["a review that did not finish", pr({ comments: [NOT_FINISHED] }), DONE, "FAILED"],
      ["a review of an older commit", pr({ comments: [review("0000000")] }), DONE, "SKIPPED"],
      ["a draft", pr({ isDraft: true }), [], "SKIPPED"],
      ["a merged PR", pr({ state: "MERGED" }), [], "SKIPPED"],
      ["a queued run", pr(), [run("queued")], "TIMEOUT"],
      [
        "a run replacing an older review",
        pr({ comments: [FINDINGS] }),
        [run("in_progress")],
        "TIMEOUT",
      ],
      ["gh failing on every call", null, [], "TIMEOUT"],
    ]

    for (const [name, prData, runs, verdict] of verdicts) {
      it(`reports ${verdict} for ${name}`, () => {
        givenGithub(prData, runs)
        assertVerdict(verdict)
      })
    }

    it("doesn't count an answer to an older commit", () => {
      const oldAnswer = { body: "<!-- ai-review-answer: 0000000 -->" }
      givenGithub(pr({ comments: [FINDINGS, oldAnswer] }), DONE)
      assertVerdict("REVIEWED")
    })

    it("tells the agent which marker to answer with", () => {
      givenGithub(pr({ comments: [FINDINGS] }), DONE)
      assert.ok(wait().stdout.includes("<!-- ai-review-answer: abc1234 -->"))
    })

    it("fails on a missing PR number", () => {
      const { status } = spawnSync("node", [SCRIPT, "wait"], { env: env(), encoding: "utf8" })
      assert.equal(status, 2)
    })
  })

  describe("stop-hook", () => {
    const cases = [
      ["findings without an answer", pr({ comments: [FINDINGS] }), DONE, true],
      ["a run in progress", pr(), [run("in_progress")], true],
      ["a head commit with no run yet", pr(), [], true],
      ["findings with an answer", pr({ comments: [FINDINGS, ANSWER] }), DONE, false],
      ["no findings", pr({ comments: [CLEAN] }), DONE, false],
      ["a review that did not finish", pr({ comments: [NOT_FINISHED] }), DONE, false],
      ["a finished run without a comment", pr(), DONE, false],
      ["a run stuck in the queue", pr(), [run("queued", HOUR)], false],
      ["a draft", pr({ isDraft: true }), [], false],
      ["a branch without a PR", null, [], false],
    ]

    for (const [name, prData, runs, blocked] of cases) {
      it(`${blocked ? "blocks on" : "lets through"} ${name}`, () => {
        givenGithub(prData, runs)
        assertBlocked(blocked)
      })
    }

    it("blocks only once", () => {
      givenGithub(pr({ comments: [FINDINGS] }), DONE)
      assertBlocked(false, '{"stop_hook_active":true}')
    })

    it("lets through invalid input", () => {
      givenGithub(pr({ comments: [FINDINGS] }), DONE)
      assertBlocked(false, "garbage")
    })

    it("lets through without gh", () => {
      const noGh = { ...process.env, PATH: path.dirname(process.execPath) }
      const { stdout, status } = stopHook("{}", noGh)
      assert.equal(status, 0)
      assert.equal(stdout, "")
    })
  })
})
