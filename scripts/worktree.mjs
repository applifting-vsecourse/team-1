#!/usr/bin/env node
// Parallel checkouts: one git worktree per story, each with its own ports and
// database, so several branches (and agents) can run the app at once.
//
//   pnpm wt new <branch> [--from <ref>]   create ../<repo>-wt/<name> on a new or existing branch
//   pnpm wt list                          worktrees with their slots and URLs
//   pnpm wt rm <name>                     remove the worktree and drop its databases
//
// Slot N (1–9) gets frontend 3050+10N, backend 4050+10N and database
// togena_wt<N> in the shared dev Postgres (localhost:5433). The main checkout
// is slot 0 and keeps the default ports. Integration tests then use
// togena_wt<N>_test automatically.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const MAX_SLOT = 9
const DB_USER = "togena"

const sh = (cmd, args, opts = {}) =>
  (execFileSync(cmd, args, { encoding: "utf8", ...opts }) ?? "").trim()

const mainRoot = path.dirname(path.resolve(sh("git", ["rev-parse", "--git-common-dir"])))
const wtParent = path.join(path.dirname(mainRoot), `${path.basename(mainRoot)}-wt`)
const compose = path.join(mainRoot, "apps/backend/docker-compose.yml")

const ports = (slot) => ({
  frontend: 3050 + slot * 10,
  backend: 4050 + slot * 10,
  db: `togena_wt${slot}`,
})

function worktrees() {
  const out = sh("git", ["worktree", "list", "--porcelain"])
  return out
    .split("\n\n")
    .map((block) => {
      const dir = block.match(/^worktree (.+)$/m)?.[1]
      const branch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? "-"
      return dir && { dir, branch, slot: readSlot(dir) }
    })
    .filter(Boolean)
}

function readSlot(dir) {
  try {
    const env = fs.readFileSync(path.join(dir, "apps/backend/.env"), "utf8")
    const port = Number(env.match(/^PORT=(\d+)/m)?.[1] ?? 4050)
    return (port - 4050) / 10
  } catch {
    return null
  }
}

function setEnv(content, key, value) {
  const line = `${key}=${value}`
  const re = new RegExp(`^${key}=.*$`, "m")
  return re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`
}

function writeEnv(dir, slot) {
  const p = ports(slot)
  // Start from the main checkout's .env so local secrets (SMTP, Resend) carry over.
  const source = (rel) => {
    const own = path.join(mainRoot, rel)
    return fs.existsSync(own)
      ? fs.readFileSync(own, "utf8")
      : fs.readFileSync(`${own}.example`, "utf8")
  }

  let be = source("apps/backend/.env")
  be = setEnv(be, "PORT", p.backend)
  be = setEnv(be, "BACKEND_URL", `http://localhost:${p.backend}`)
  be = setEnv(be, "FRONTEND_URL", `http://localhost:${p.frontend}`)
  be = setEnv(be, "DATABASE_URL", `postgresql://${DB_USER}:${DB_USER}@localhost:5433/${p.db}`)
  fs.writeFileSync(path.join(dir, "apps/backend/.env"), be)

  let fe = source("apps/frontend/.env")
  fe = setEnv(fe, "VITE_API_URL", `http://localhost:${p.backend}/api`)
  fe = setEnv(fe, "VITE_BETTER_AUTH_URL", `http://localhost:${p.backend}`)
  fe = setEnv(fe, "VITE_PORT", p.frontend)
  fs.writeFileSync(path.join(dir, "apps/frontend/.env"), fe)
}

function psql(sql) {
  // Best effort: the dev Postgres may not be running yet; `pnpm dev` in the
  // worktree starts it and `prisma migrate deploy` creates the database.
  try {
    sh(
      "docker",
      [
        "compose",
        "-f",
        compose,
        "exec",
        "-T",
        "db",
        "psql",
        "-U",
        DB_USER,
        "-d",
        DB_USER,
        "-c",
        sql,
      ],
      {
        stdio: "pipe",
      },
    )
    return true
  } catch {
    return false
  }
}

function cmdNew(args) {
  const branch = args[0]
  if (!branch) fail("Usage: pnpm wt new <branch> [--from <ref>]")
  const fromIdx = args.indexOf("--from")
  const from = fromIdx >= 0 ? args[fromIdx + 1] : "origin/main"

  const used = new Set(worktrees().map((w) => w.slot))
  const slot = Array.from({ length: MAX_SLOT }, (_, i) => i + 1).find((s) => !used.has(s))
  if (!slot) fail(`All ${MAX_SLOT} slots are taken; remove a worktree first.`)

  const name = branch.replace(/^[a-z]+\//, "").replace(/[^\w.-]+/g, "-")
  const dir = path.join(wtParent, name)
  if (fs.existsSync(dir)) fail(`${dir} already exists.`)
  fs.mkdirSync(wtParent, { recursive: true })

  const exists = (ref) => {
    try {
      sh("git", ["rev-parse", "--verify", "--quiet", ref])
      return true
    } catch {
      return false
    }
  }
  sh("git", ["fetch", "origin", "--quiet"], { stdio: "inherit" })
  if (exists(`refs/heads/${branch}`)) {
    sh("git", ["worktree", "add", dir, branch], { stdio: "inherit" })
  } else if (exists(`refs/remotes/origin/${branch}`)) {
    sh("git", ["worktree", "add", "--track", "-b", branch, dir, `origin/${branch}`], {
      stdio: "inherit",
    })
  } else {
    sh("git", ["worktree", "add", "--no-track", "-b", branch, dir, from], {
      stdio: "inherit",
    })
  }

  writeEnv(dir, slot)
  const p = ports(slot)
  psql(`CREATE DATABASE ${p.db}`)

  console.log("Installing dependencies…")
  sh("pnpm", ["install", "--frozen-lockfile", "--prefer-offline"], {
    cwd: dir,
    stdio: "inherit",
  })
  // The Prisma client is generated into src/ (gitignored); without it every
  // backend test fails to compile in a fresh worktree.
  sh("pnpm", ["backend", "prisma:generate"], { cwd: dir, stdio: "inherit" })

  console.log(`
✔  Worktree ready (slot ${slot})
   ${dir}
   branch    ${branch}
   frontend  http://localhost:${p.frontend}
   backend   http://localhost:${p.backend}/api
   database  ${p.db}

   cd ${dir} && pnpm dev     # migrate, seed and start this slot
   cd ${dir} && claude       # an agent working only here
`)
}

function cmdList() {
  for (const w of worktrees()) {
    const p = w.slot == null ? null : ports(w.slot)
    const urls = p ? `:${p.frontend} / :${p.backend}` : "(no .env)"
    console.log(
      `${String(w.slot ?? "?").padEnd(2)} ${w.branch.padEnd(45)} ${urls.padEnd(14)} ${w.dir}`,
    )
  }
}

function cmdRm(args) {
  const name = args[0]
  if (!name) fail("Usage: pnpm wt rm <name>")
  const w = worktrees().find(
    (w) =>
      w.dir !== mainRoot && (path.basename(w.dir) === name || w.branch === name || w.dir === name),
  )
  if (!w) fail(`No worktree named ${name}. See: pnpm wt list`)

  sh("git", ["worktree", "remove", w.dir, ...args.slice(1)], {
    stdio: "inherit",
  })
  if (w.slot) {
    const { db } = ports(w.slot)
    // The integration tests use <db>_test and Playwright <db>_e2e (apps/e2e/scripts/database-url.mjs).
    for (const d of [db, `${db}_test`, `${db}_e2e`]) {
      psql(`DROP DATABASE IF EXISTS ${d} WITH (FORCE)`)
    }
  }
  console.log(`✔  Removed ${w.dir}. The branch ${w.branch} is kept (git branch -d ${w.branch}).`)
}

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

const [cmd, ...rest] = process.argv.slice(2)
const commands = { new: cmdNew, list: cmdList, ls: cmdList, rm: cmdRm }
;(commands[cmd] ?? (() => fail("Usage: pnpm wt <new|list|rm> …")))(rest)
