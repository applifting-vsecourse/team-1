// Creates a review folder from the board: tickets in „In Business Review“, checking that their PRs are in this checkout.
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { REPO, RUN_DIR } from "./lib/env.mjs"

const run = (cmd, argv) =>
  execFileSync(cmd, argv, {
    cwd: REPO,
    encoding: "utf8",
    maxBuffer: 64e6,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
const file = path.join(RUN_DIR, "review.json")
if (fs.existsSync(file)) throw new Error(`${file} už existuje; nepřepisuju.`)

const exclude = path.resolve(REPO, run("git", ["rev-parse", "--git-path", "info/exclude"]))
const rule = "/.local/manual-flows/"
const current = fs.existsSync(exclude) ? fs.readFileSync(exclude, "utf8") : ""
if (!current.split("\n").includes(rule)) fs.appendFileSync(exclude, `\n${rule}\n`)

const { items } = JSON.parse(
  run("gh", [
    "project",
    "item-list",
    "12",
    "--owner",
    "applifting-vsecourse",
    "--limit",
    "2000",
    "--format",
    "json",
  ]),
)
const stories = {}
for (const item of items.filter((i) => i.status === "In Business Review" && i.content?.number)) {
  const prs = []
  for (const url of item["linked pull requests"] ?? []) {
    const pr = JSON.parse(run("gh", ["pr", "view", url, "--json", "number,state,mergeCommit"]))
    let inHead = false
    if (pr.mergeCommit) {
      try {
        run("git", ["merge-base", "--is-ancestor", pr.mergeCommit.oid, "HEAD"])
        inHead = true
      } catch {
        /* not in HEAD */
      }
    }
    prs.push({ number: pr.number, state: pr.state, inHead })
    if (!inHead && pr.state !== "CLOSED")
      console.log(
        `⚠ #${item.content.number}: PR #${pr.number} (${pr.state}) není v tomto checkoutu`,
      )
  }
  stories[item.content.number] = { title: item.content.title, note: "", itemId: item.id, prs }
}

const id = path.basename(RUN_DIR)
const d = new Date()
fs.mkdirSync(path.join(RUN_DIR, "scenarios"), { recursive: true })
fs.writeFileSync(
  file,
  JSON.stringify(
    { id, title: `Business review ${d.getDate()}. ${d.getMonth() + 1}.`, stories, extra: [] },
    null,
    2,
  ),
)
console.log(`${Object.keys(stories).length} ticketů → ${file}`)
