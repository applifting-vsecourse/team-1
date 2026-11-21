import { execFileSync, spawnSync } from "node:child_process"
import { writeFileSync, readFileSync, existsSync, mkdtempSync, unlinkSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createHash } from "node:crypto"

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim()
const output = mkdtempSync(join(tmpdir(), "togena-pr-preview-"))
const harness = JSON.parse(readFileSync(new URL("./captures.json", import.meta.url), "utf8"))
const e2e = join(root, "apps/e2e")
const failed = []
// Flush each PNG line before starting any synchronous child process.
async function emit(line) {
  await new Promise((resolve, reject) => process.stdout.write(line + "\n", (err) => err ? reject(err) : resolve()))
}
const generatedFiles = []
function git(args) { execFileSync("git", args, { cwd: root, stdio: "inherit" }) }
for (const { phase, sha, prs } of harness.groups) {
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("Unexpected Git revision")
  git(["fetch", "--no-tags", "--depth=1", "origin", sha])
  git(["switch", "--detach", sha])
  for (const old of generatedFiles.splice(0)) if (existsSync(old)) unlinkSync(old)
  for (const pr of prs) {
    const file = join(e2e, "tests", "zz-capture-" + pr + ".spec.ts")
    let spec = harness.scenarios[pr]
    const marker = spec.indexOf("\ntest(")
    if (marker < 0) throw new Error("Missing test declaration")
    const fixture = "\ntest.beforeEach(async ({}, info) => { process.env.SHOT_PATH = " +
      JSON.stringify(join(output, pr + "-" + phase + "-")) + " + info.project.name + '.png' })\n"
    spec = spec.slice(0, marker) + fixture + spec.slice(marker)
    writeFileSync(file, spec)
    generatedFiles.push(file)
  }
  const config = join(e2e, "capture.config.ts")
  writeFileSync(config, [
    'import base from "./playwright.config"',
    'import { defineConfig, devices } from "@playwright/test"',
    'export default defineConfig({ ...base, retries: 0, timeout: 45000, reporter: "list", testMatch: /zz-capture-.*\\.spec\\.ts/, projects: [',
    ' {name:"desktop", use:{...devices["Desktop Chrome"],viewport:{width:1280,height:800},deviceScaleFactor:1}},',
    ' {name:"mobile", use:{...devices["Pixel 7"],viewport:{width:360,height:800},deviceScaleFactor:1}}',
    '] })',
  ].join("\n"))
  const run = spawnSync("pnpm", ["exec", "playwright", "test", "--config", "capture.config.ts"], {
    cwd: e2e, stdio: "inherit", env: {...process.env, SHOT_PHASE: phase},
  })
  if (run.status !== 0) failed.push(sha)
  for (const pr of prs) for (const view of ["desktop","mobile"]) {
    const name = pr + "-" + phase + "-" + view
    const path = join(output, name + ".png")
    if (!existsSync(path)) { console.log("CAPTURE_MISSING", name); continue }
    const bytes = readFileSync(path)
    const data = bytes.toString("base64")
    await emit(["CAPTURE_PNG", name, bytes.length, createHash("sha256").update(bytes).digest("hex")].join(" "))
    for (let off = 0; off < data.length; off += 4096)
      await emit(["CAPTURE_DATA", name, off, data.slice(off, off + 4096)].join(" "))
  }
}
if (failed.length) { console.error("Some capture scenarios failed at", failed.join(", ")); process.exitCode = 1 }
