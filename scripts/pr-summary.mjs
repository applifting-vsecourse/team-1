#!/usr/bin/env node
// Short "what changed" report for a PR, from git alone (no AI, no cost).
// Usage: node scripts/pr-summary.mjs [base-ref]   (default origin/main)
// CI posts the output as a sticky PR comment (.github/workflows/pr-summary.yml).
import { execFileSync } from "node:child_process"

// Keep in sync with CLAUDE.md ("Pull request size") and .claude/agents/reviewer.md.
const MAX_LINES = 400
const MAX_FILES = 20

const base = process.argv[2] ?? "origin/main"
const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).trim()
const range = `${base}...HEAD`

const stats = git("diff", "--numstat", "--no-renames", range)
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    const [a, d, ...p] = l.split("\t")
    return { file: p.join("\t"), add: Number(a) || 0, del: Number(d) || 0 }
  })

if (stats.length === 0) {
  console.log("**Co se změnilo:** nic (prázdný diff proti `main`).")
  process.exit(0)
}

const commits = git("log", "--no-merges", "--format=%s", range).split("\n").filter(Boolean)
const add = stats.reduce((s, f) => s + f.add, 0)
const del = stats.reduce((s, f) => s + f.del, 0)

const isTest = (f) => /\.(int-)?(spec|test)\.tsx?$/.test(f)
const isLock = (f) => f === "pnpm-lock.yaml" || f.endsWith("routeTree.gen.ts")

// area -> set of short names
const areas = new Map()
const put = (area, name) => areas.set(area, (areas.get(area) ?? new Set()).add(name))

for (const { file: f } of stats) {
  let m
  if ((m = f.match(/^apps\/backend\/src\/modules\/([^/]+)\//))) put("Backend", m[1])
  else if ((m = f.match(/^apps\/backend\/src\/(shared|core)\/([^/]+)/)))
    put("Backend", `${m[1]}/${m[2]}`)
  else if (f.startsWith("apps/backend/prisma/"))
    put("Databáze", f.includes("/migrations/") ? "migrace" : "schema.prisma")
  else if ((m = f.match(/^apps\/frontend\/src\/features\/([^/]+)\//))) put("Frontend", m[1])
  else if ((m = f.match(/^apps\/frontend\/src\/(components|routes|i18n|app)\//)))
    put("Frontend", m[1])
  else if (f.startsWith("docs/") || /^[A-Z]+\.md$/.test(f)) put("Docs", f.replace(/^docs\//, ""))
  else if (
    f.startsWith(".github/") ||
    f.startsWith(".claude/") ||
    f.startsWith("scripts/") ||
    f.startsWith(".husky/")
  )
    put("Tooling", f.split("/")[0])
  else if (!isLock(f)) put("Ostatní", f)
}

const lines = []
lines.push(
  `**Co se změnilo** · ${commits.length} commit${commits.length === 1 ? "" : commits.length < 5 ? "y" : "ů"} · ${stats.length} souborů · +${add} −${del}`,
)
lines.push("")
for (const [area, set] of areas) {
  const names = [...set].sort()
  const shown = names
    .slice(0, 6)
    .map((n) => `\`${n}\``)
    .join(", ")
  lines.push(`- **${area}:** ${shown}${names.length > 6 ? ` +${names.length - 6}` : ""}`)
}

// New endpoints: decorators added in this diff.
const patch = git("diff", "-U0", range, "--", "apps/backend/src/**/*.controller.ts")
const endpoints = []
let cur = ""
let ctrl = ""
for (const l of patch.split("\n")) {
  if (l.startsWith("+++ ")) {
    cur = l.slice(6).replace(/.*\//, "").replace(".controller.ts", "")
    ctrl = ""
  } else if (l.startsWith("+") && (ctrl === "" || /@Controller/.test(l))) {
    const c = l.match(/@Controller\(['"`]([^'"`]*)['"`]\)/)
    if (c) ctrl = c[1]
  }
  const e = l.match(/^\+\s*@(Get|Post|Put|Patch|Delete)\((?:['"`]([^'"`]*)['"`])?\)/)
  if (e)
    endpoints.push(`${e[1].toUpperCase()} /${[ctrl || `…${cur}`, e[2]].filter(Boolean).join("/")}`)
}
if (endpoints.length)
  lines.push(
    `- **Nové endpointy:** ${endpoints
      .slice(0, 8)
      .map((e) => `\`${e}\``)
      .join(", ")}`,
  )

// Things a tech lead wants to notice.
const files = stats.map((s) => s.file)
const warn = []
// Size = lines a human has to read: no lockfile, generated files, tests or migration SQL.
const reviewed = stats.filter(
  (f) => !isLock(f.file) && !isTest(f.file) && !f.file.includes("/migrations/"),
)
const reviewLines = reviewed.reduce((n, f) => n + f.add + f.del, 0)
if (reviewLines > MAX_LINES || reviewed.length > MAX_FILES)
  warn.push(
    `**PR je velký** (${reviewLines} řádků kódu, ${reviewed.length} souborů; limit ${MAX_LINES} / ${MAX_FILES}) — rozděl featuru na menší PR`,
  )
const migrations = new Set(
  files
    .filter((f) => /^apps\/backend\/prisma\/migrations\/[^/]+\//.test(f))
    .map((f) => f.split("/")[4]),
)
if (migrations.size > 1)
  warn.push(`víc migrací (${migrations.size}) — pravidlo je max. jedna na PR`)
else if (migrations.size === 1) warn.push("nová migrace")
const shared = files.filter((f) =>
  /^(apps\/backend\/prisma\/schema\.prisma|apps\/backend\/src\/app\.module\.ts|apps\/frontend\/src\/app\/routes\.ts|apps\/frontend\/src\/components\/)/.test(
    f,
  ),
)
if (shared.length)
  warn.push(
    `sdílené soubory (${shared.length}): ${shared
      .slice(0, 2)
      .map((f) => `\`${f.split("/").pop()}\``)
      .join(", ")}${shared.length > 2 ? " …" : ""}`,
  )
const src = files.filter(
  (f) => /\.tsx?$/.test(f) && !isTest(f) && !f.endsWith(".gen.ts") && /^apps\/.*\/src\//.test(f),
)
if (src.length && !files.some(isTest)) warn.push("mění se kód, ale žádný test")
const loc = (lang) =>
  files
    .filter((f) => f.includes(`/i18n/locales/${lang}/`))
    .map((f) => f.split("/").pop())
    .sort()
    .join()
if (loc("en") !== loc("cs")) warn.push("překlady: změněné soubory v `en` a `cs` se liší")
if (files.some((f) => f === "pnpm-lock.yaml" || /^apps\/[^/]+\/package\.json$/.test(f)))
  warn.push("změna závislostí")
if (warn.length) lines.push(`- **Pozor:** ${warn.join(" · ")}`)

lines.push("")
lines.push(
  `<details><summary>Commity</summary>\n\n${commits
    .slice(0, 10)
    .map((c) => `- ${c}`)
    .join("\n")}${commits.length > 10 ? `\n- … +${commits.length - 10}` : ""}\n\n</details>`,
)

console.log(lines.join("\n"))
