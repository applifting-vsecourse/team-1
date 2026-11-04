// Runs scripts/pr-review.mjs as a process against a fake `gh`. Run: pnpm test:scripts
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, it } from "node:test"

const SCRIPT = path.join(import.meta.dirname, "pr-review.mjs")
const SHA = "abc1234def0000000000000000000000000000ff"
const OLD_SHA = "0000000000000000000000000000000000000000"

// Serves the prepared JSON; a missing pr.json behaves like a branch without a PR.
// `gh pr comment` is recorded in comments.log.
const FAKE_GH = `#!/usr/bin/env bash
case "$1 $2" in
  "pr view") [ -f "$FAKE_GH_DIR/pr.json" ] || { echo "no pull requests found" >&2; exit 1; }
             cat "$FAKE_GH_DIR/pr.json" ;;
  "pr comment") [ -z "$FAKE_GH_COMMENT_FAILS" ] || { echo "network down" >&2; exit 1; }
                echo "$@" >> "$FAKE_GH_DIR/comments.log" ;;
  api*) case "$2" in
          */reviews/*/comments*) cat "$FAKE_GH_DIR/review-comments.json" ;;
          */reviews*) cat "$FAKE_GH_DIR/reviews.json" ;;
        esac ;;
esac
`

const BOT = { login: "chatgpt-codex-connector" }

// Codex's summary comment, as it looks on a real PR.
const codex = (state, author = BOT) => ({
  author,
  createdAt: new Date().toISOString(),
  body:
    "<!-- codex-pull-request-review-summary -->\n" +
    `<!-- codex-review-state:v1 ${JSON.stringify({ code_review: state, security_review: {} })} -->\n\n` +
    "## Codex Review Summary",
})
const done = (has_any_findings, commit_sha = SHA) =>
  codex({ commit_sha, status: "completed", has_any_findings, has_unresolved_findings: null })
const FINDINGS = done(true)
const CLEAN = done(false)
const RUNNING = codex({ commit_sha: SHA, status: "running", has_any_findings: null })
const FAILED = codex({ commit_sha: SHA, status: "failed", has_any_findings: null })
const OLDER = done(false, OLD_SHA)
const ANSWER = { author: { login: "dev" }, body: "<!-- ai-review-answer: abc1234 -->\nopraveno" }

const REVIEWS = [
  { id: 1, user: { login: "chatgpt-codex-connector[bot]" }, commit_id: SHA },
  { id: 2, user: { login: "chatgpt-codex-connector[bot]" }, commit_id: OLD_SHA },
]
const REVIEW_COMMENTS = [
  {
    path: "apps/x.ts",
    line: 42,
    body: "**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Čte platby bez organizationId**\n\nDetail",
  },
]

const HOUR = 3_600_000
const pr = (overrides = {}, commitAge = 0) => ({
  number: 7,
  state: "OPEN",
  isDraft: false,
  headRefOid: SHA,
  commits: [{ committedDate: new Date(Date.now() - commitAge).toISOString() }],
  comments: [],
  ...overrides,
})

describe("pr-review", () => {
  let dir

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-review-"))
    fs.writeFileSync(path.join(dir, "gh"), FAKE_GH, { mode: 0o755 })
    // `--paginate --slurp`: one outer array of pages; the head's review is on page 2.
    fs.writeFileSync(path.join(dir, "reviews.json"), JSON.stringify([[REVIEWS[1]], [REVIEWS[0]]]))
    fs.writeFileSync(path.join(dir, "review-comments.json"), JSON.stringify([REVIEW_COMMENTS]))
  })
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

  const givenGithub = (prData) => {
    if (prData) fs.writeFileSync(path.join(dir, "pr.json"), JSON.stringify(prData))
  }
  const posted = () => {
    const log = path.join(dir, "comments.log")
    return fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n") : []
  }

  const env = (extra = {}) => ({
    ...process.env,
    PATH: `${dir}:${process.env.PATH}`,
    FAKE_GH_DIR: dir,
    ...extra,
  })

  const wait = (extra = {}) => {
    const timing = {
      PR_REVIEW_POLL_MS: "10",
      PR_REVIEW_GRACE_MS: "50",
      PR_REVIEW_TIMEOUT_MS: "200",
      ...extra,
    }
    return spawnSync(process.execPath, [SCRIPT, "wait", "7"], {
      env: env(timing),
      encoding: "utf8",
    })
  }

  const stopHook = (input = "{}", processEnv = env()) =>
    spawnSync(process.execPath, [SCRIPT, "stop-hook"], { env: processEnv, input, encoding: "utf8" })

  const assertVerdict = (verdict) => {
    const { stdout, status } = wait()
    assert.equal(status, 0)
    assert.match(stdout, new RegExp(`^VERDICT: ${verdict}$`, "m"))
    return stdout
  }

  const assertBlocked = (expected, input) => {
    const { stdout, status } = stopHook(input)
    assert.equal(status, 0)
    if (expected) assert.equal(JSON.parse(stdout).decision, "block")
    else assert.equal(stdout, "")
  }

  describe("wait", () => {
    const verdicts = [
      ["findings without an answer", pr({ comments: [FINDINGS] }), "REVIEWED"],
      ["findings with an answer", pr({ comments: [FINDINGS, ANSWER] }), "ANSWERED"],
      ["no findings", pr({ comments: [CLEAN] }), "CLEAN"],
      ["a review that failed", pr({ comments: [FAILED] }), "FAILED"],
      ["a review still running", pr({ comments: [RUNNING] }), "TIMEOUT"],
      ["only a review of an older commit", pr({ comments: [OLDER] }), "TIMEOUT"],
      ["no review at all", pr(), "TIMEOUT"],
      ["a draft", pr({ isDraft: true }), "SKIPPED"],
      ["a merged PR", pr({ state: "MERGED" }), "SKIPPED"],
      ["gh failing on every call", null, "TIMEOUT"],
    ]

    for (const [name, prData, verdict] of verdicts) {
      it(`reports ${verdict} for ${name}`, () => {
        givenGithub(prData)
        assertVerdict(verdict)
      })
    }

    it("lists the findings of the head commit's review", () => {
      givenGithub(pr({ comments: [FINDINGS] }))
      const stdout = assertVerdict("REVIEWED")
      assert.ok(stdout.includes("P1 apps/x.ts:42 — Čte platby bez organizationId"))
      assert.equal(stdout.match(/^P1 /gm).length, 1)
    })

    it("uses the latest Codex state when there are several", () => {
      givenGithub(pr({ comments: [FINDINGS, done(false, OLD_SHA)] }))
      assertVerdict("TIMEOUT")
    })

    it("ignores a state comment that isn't from Codex", () => {
      givenGithub(
        pr({
          comments: [
            codex(
              { commit_sha: SHA, status: "completed", has_any_findings: false },
              { login: "dev" },
            ),
          ],
        }),
      )
      assertVerdict("TIMEOUT")
    })

    it("asks for a review once when the head commit has none", () => {
      givenGithub(pr({ comments: [OLDER] }))
      assertVerdict("TIMEOUT")
      assert.deepEqual(posted(), ["pr comment 7 --body @codex review"])
    })

    it("still ends with a verdict when asking for a review fails", () => {
      givenGithub(pr({ comments: [OLDER] }))
      const { stdout, status } = wait({ FAKE_GH_COMMENT_FAILS: "1" })
      assert.equal(status, 0)
      assert.match(stdout, /^VERDICT: TIMEOUT$/m)
    })

    it("doesn't ask while Codex reviews the head commit", () => {
      givenGithub(pr({ comments: [RUNNING] }))
      assertVerdict("TIMEOUT")
      assert.deepEqual(posted(), [])
    })

    it("doesn't count an answer to an older commit", () => {
      const oldAnswer = { author: { login: "dev" }, body: "<!-- ai-review-answer: 0000000 -->" }
      givenGithub(pr({ comments: [FINDINGS, oldAnswer] }))
      assertVerdict("REVIEWED")
    })

    it("tells the agent which marker to answer with", () => {
      givenGithub(pr({ comments: [FINDINGS] }))
      assert.ok(wait().stdout.includes("<!-- ai-review-answer: abc1234 -->"))
    })

    it("fails on a missing PR number", () => {
      const { status } = spawnSync(process.execPath, [SCRIPT, "wait"], {
        env: env(),
        encoding: "utf8",
      })
      assert.equal(status, 2)
    })
  })

  describe("stop-hook", () => {
    const cases = [
      ["findings without an answer", pr({ comments: [FINDINGS] }), true],
      ["a review running", pr({ comments: [RUNNING] }, HOUR), true],
      ["a recent head commit with no review yet", pr({ comments: [OLDER] }), true],
      ["findings with an answer", pr({ comments: [FINDINGS, ANSWER] }), false],
      ["no findings", pr({ comments: [CLEAN] }), false],
      ["a review that failed", pr({ comments: [FAILED] }), false],
      ["an old head commit with no review", pr({}, HOUR), false],
      ["a draft", pr({ isDraft: true }), false],
      ["a branch without a PR", null, false],
    ]

    for (const [name, prData, blocked] of cases) {
      it(`${blocked ? "blocks on" : "lets through"} ${name}`, () => {
        givenGithub(prData)
        assertBlocked(blocked)
      })
    }

    it("blocks only once", () => {
      givenGithub(pr({ comments: [FINDINGS] }))
      assertBlocked(false, '{"stop_hook_active":true}')
    })

    it("lets through invalid input", () => {
      givenGithub(pr({ comments: [FINDINGS] }))
      assertBlocked(false, "garbage")
    })

    it("lets through without gh", () => {
      // An empty PATH: the directory of node may hold the real gh (/usr/bin).
      const noGh = { ...process.env, PATH: fs.mkdtempSync(path.join(dir, "empty-")) }
      const { stdout, status } = stopHook("{}", noGh)
      assert.equal(status, 0)
      assert.equal(stdout, "")
    })
  })
})
