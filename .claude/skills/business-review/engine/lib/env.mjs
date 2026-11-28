import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

export const REPO = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim()

/** Playwright from the repo's existing dependencies (apps/e2e). */
const e2eRequire = createRequire(path.join(REPO, "apps/e2e/package.json"))
export const { chromium } = e2eRequire("@playwright/test")

/** Minimal .env parser (no dependencies). */
export function readEnvFile(file) {
  const out = {}
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    out[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return out
}

const backendEnv = readEnvFile(path.join(REPO, "apps/backend/.env"))
export const DATABASE_URL = process.env.BR_DATABASE_URL ?? backendEnv.DATABASE_URL

function parseArgs(argv) {
  const args = { flags: new Set(), values: {} }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("--")) continue
    const [k, inline] = a.slice(2).split("=")
    if (inline !== undefined) args.values[k] = inline
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) args.values[k] = argv[++i]
    else args.flags.add(k)
  }
  return args
}
export const args = parseArgs(process.argv.slice(2))

/** Run folder: --run <path>, otherwise the latest .local/manual-flows/br-*; `new` creates today's. */
function runDir() {
  if (args.values.run) return path.resolve(args.values.run)
  const root = path.join(REPO, ".local/manual-flows")
  const runs = fs.existsSync(root)
    ? fs
        .readdirSync(root)
        .filter(
          (d) => /^br-\d{4}-\d\d-\d\d/.test(d) && fs.existsSync(path.join(root, d, "review.json")),
        )
    : []
  if (process.argv[2] === "new") {
    const today = `br-${new Date().toLocaleDateString("sv-SE")}`
    let name = today
    for (let i = 2; fs.existsSync(path.join(root, name)); i++) name = `${today}-${i}`
    return path.join(root, name)
  }
  const latest = runs.sort((a, b) => a.localeCompare(b, "en", { numeric: true })).at(-1)
  if (!latest) throw new Error("Žádné review s review.json. Založ ho: br.mjs new")
  return path.join(root, latest)
}
export const RUN_DIR = runDir()
export const OUT_DIR = path.join(RUN_DIR, "out")
export const STATE_DIR = path.join(RUN_DIR, "state")

export const FRONTEND_URL = (
  args.values.url ??
  process.env.BR_URL ??
  backendEnv.FRONTEND_URL ??
  "http://localhost:3050"
).replace(/\/$/, "")
const port = backendEnv.PORT ?? "4050"
export const BACKEND_URL = (
  args.values.api ??
  process.env.BR_API ??
  backendEnv.BACKEND_URL ??
  `http://localhost:${port}`
).replace(/\/$/, "")
export const API = `${BACKEND_URL}/api`
/** Delay of visible feature steps (ms per action). */
export const SLOW = Number(args.values.slow ?? process.env.BR_SLOW ?? 800)

/** Seed accounts (CONTRIBUTING.md „Účty ze seedu“); can be overridden through env. */
export const ORGANIZER = {
  email: process.env.BR_ORGANIZER_EMAIL ?? "organizator@example.com",
  password: process.env.BR_ORGANIZER_PASSWORD ?? "password1",
}
export const PARTICIPANT = {
  email: process.env.BR_PARTICIPANT_EMAIL ?? "togena.team1@gmail.com",
  password: process.env.BR_PARTICIPANT_PASSWORD ?? "password4",
}

export const backendEnvFile = backendEnv
