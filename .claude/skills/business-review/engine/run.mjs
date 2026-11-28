#!/usr/bin/env node
// Business review in one command: seeds data through the API, opens the control panel + the app and walks
// you through all scenarios. No AI, no automatic verdicts.
//
//  node .claude/skills/business-review/engine/br.mjs
//  --run <dir>    an older review (default: the latest)
//  --fresh        new data for all scenarios (otherwise the previous run's data is reused)
//  --from 3.2     start at this block (default: where you stopped last time)
//  --slow 500     delay of visible steps in ms (default 800)
//  --list         overview of blocks and tickets
//  --auto         self-check of the scenarios: walks all views headless and saves screenshots to out/shots
import fs from "node:fs"
import path from "node:path"
import readline from "node:readline"
import { spawn } from "node:child_process"
import {
  args,
  API,
  FRONTEND_URL,
  REPO,
  RUN_DIR,
  OUT_DIR,
  STATE_DIR,
  ORGANIZER,
  backendEnvFile,
} from "./lib/env.mjs"
import { req, sleep } from "./lib/api.mjs"
import { sessionsOnce, STAMP, participantEmail } from "./lib/seed.mjs"
import { REVIEW, story, loadScenarios } from "./lib/review.mjs"
import { Harness } from "./lib/harness.mjs"
import { Panel } from "./lib/panel.mjs"
import { NOTES_FILE, notes, applyEdit } from "./lib/notes.mjs"
import { db } from "./lib/db.mjs"

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
}
const AUTO = args.flags.has("auto")
for (const dir of [OUT_DIR, STATE_DIR]) fs.mkdirSync(dir, { recursive: true })

const scenarios = await loadScenarios()
const onlyBlocks = args.values.only ? String(args.values.only).split(",") : null
const wanted = (b) => !onlyBlocks || onlyBlocks.some((x) => b.id === x || b.id.startsWith(`${x}.`))
const blocks = scenarios
  .flatMap((scenario) => scenario.blocks.map((block) => ({ ...block, scenario })))
  .filter(wanted)
if (!blocks.length) throw new Error(`--only ${args.values.only} neodpovídá žádnému bloku.`)

if (args.flags.has("list")) {
  for (const b of blocks) {
    console.log(`\n${C.bold(`${b.id}  ${b.title}`)}`)
    for (const n of b.stories) console.log(`     ${story(n).label}`)
  }
  process.exit(0)
}

let devServer = null
let harness = null
let panel = null
let closing = false
async function shutdown(code = 0) {
  if (closing) return
  closing = true
  await harness?.close()
  await panel?.close()
  if (!AUTO && fs.existsSync(NOTES_FILE))
    console.log(`\nPoznámky jsou uložené v ${NOTES_FILE}. Až skončíte, napište Claudovi „hotovo“.`)
  if (devServer) {
    try {
      process.kill(-devServer.pid)
    } catch {
      /* already stopped */
    }
  }
  process.exit(code)
}
process.on("SIGINT", () => {
  console.log("\nUkončuji…")
  void shutdown(0)
})

// --- Safety: local app only and no real e-mails ---
for (const url of [API, FRONTEND_URL]) {
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
    console.log(C.red(`Skript běží jen proti lokální aplikaci, ne ${url}.`))
    process.exit(1)
  }
}
// shortcut: cannot see the environment of an already running backend, only .env and this shell;
// check the transport through the app if it ever exposes it.
const mailEnv = { ...backendEnvFile, ...process.env }
if (mailEnv.RESEND_API_KEY || mailEnv.SMTP_HOST) {
  console.log(
    C.red(
      "V apps/backend/.env nebo v prostředí je nastavený Resend nebo SMTP – e-maily by mohly odejít doopravdy. Vypněte je a spusťte skript znovu.",
    ),
  )
  process.exit(1)
}

const up = async (url) => {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(3000) })).status < 500
  } catch {
    return false
  }
}
const appUp = async () => (await up(`${API}/health`)) && (await up(FRONTEND_URL))
if (!(await appUp())) {
  if (AUTO) {
    console.log(C.red("Aplikace neběží; --auto ji nespouští."))
    process.exit(1)
  }
  const logFile = path.join(OUT_DIR, "dev-server.log")
  console.log(C.yellow("Aplikace neběží, spouštím `pnpm dev` (migrace, seed, oba servery)…"))
  console.log(C.dim(`log: ${logFile}`))
  const log = fs.openSync(logFile, "w")
  devServer = spawn("pnpm", ["dev"], { cwd: REPO, detached: true, stdio: ["ignore", log, log] })
  let exited = false
  devServer.on("exit", () => (exited = true))
  for (let i = 0; i < 150 && !exited && !(await appUp()); i++) await sleep(2000)
  if (!(await appUp())) {
    console.log(
      C.red(
        "Aplikace se nerozběhla. Zkontrolujte, že běží Docker/OrbStack, a podívejte se do logu.",
      ),
    )
    await shutdown(1)
  }
}

try {
  await sessionsOnce()
} catch (e) {
  console.log(C.red(`Přihlášení účtů ze seedu selhalo: ${e.message}`))
  console.log(
    "Účty jsou v CONTRIBUTING.md; lze přepsat přes BR_ORGANIZER_EMAIL/PASSWORD a BR_PARTICIPANT_EMAIL/PASSWORD.",
  )
  await shutdown(1)
}

// --- Data: seeded fast through the API before the visible part; the previous run's data is reused ---
const stateFile = path.join(STATE_DIR, `last-run-${new URL(API).port}.json`)
let saved = { data: {} }
try {
  saved = JSON.parse(fs.readFileSync(stateFile, "utf8"))
} catch {
  /* first run */
}
const data = args.flags.has("fresh") ? {} : saved.data
const save = () =>
  fs.writeFileSync(stateFile, JSON.stringify({ data, block: saved.block }, null, 1))

async function stillThere(entry) {
  if (entry.account)
    return (
      (await db((c) => c.query('SELECT 1 FROM "user" WHERE email = $1', [entry.account.email])))
        .rowCount > 0
    )
  const { organizer } = await sessionsOnce()
  for (const id of entry.eventIds ?? []) {
    const res = await req("GET", `/organizer/events/${id}`, {
      cookie: organizer,
      ok: [200, 403, 404],
    })
    if (res.status !== 200) return false
  }
  return true
}

async function prepare(scenario) {
  if (data[scenario.id] && (await stillThere(data[scenario.id]))) {
    console.log(C.dim(`· scénář ${scenario.id}: data z minulého spuštění (--fresh pro nová)`))
    return
  }
  delete data[scenario.id]
  const started = Date.now()
  data[scenario.id] = (await scenario.seed?.()) ?? {}
  save()
  console.log(
    `${C.green("✓")} scénář ${scenario.id} (${((Date.now() - started) / 1000).toFixed(1)} s): ${data[scenario.id].summary ?? "bez dat"}`,
  )
}

// Data is seeded in the background; windows open at once and only the current scenario is awaited.
const pendingSeeds = new Map()
function ensureData(scenario) {
  if (!pendingSeeds.has(scenario.id)) {
    const job = prepare(scenario).catch((e) => {
      pendingSeeds.delete(scenario.id)
      console.log(C.red(`✗ data scénáře ${scenario.id}: ${e.message}`))
      throw e
    })
    job.catch(() => {})
    pendingSeeds.set(scenario.id, job)
  }
  return pendingSeeds.get(scenario.id)
}
// Seed order starts at the block where the run begins.
const start = Math.max(
  0,
  blocks.findIndex((b) => b.id === String(args.values.from ?? saved.block)),
)
for (const b of [...blocks.slice(start), ...blocks.slice(0, start)]) void ensureData(b.scenario)

// --- Visible part ---
let at = start
let view = 0
let busy = false
let log = []
const seen = new Set()
const note = (text, kind = "info") => {
  log = [...log, { text, kind }].slice(-6)
  if (kind !== "info") console.log(C.yellow(`   ${text}`))
  void render()
}

async function render() {
  if (!panel) return
  const b = blocks[at]
  const lastView = view >= b.views.length - 1
  const judged = (x) => x.stories.every((n) => notes.blocks[x.id]?.stories[n]?.verdict)
  const verdicts = new Set(
    Object.values(notes.blocks).flatMap((e) =>
      Object.entries(e.stories)
        .filter(([, s]) => s.verdict)
        .map(([n]) => n),
    ),
  )
  await panel.render({
    menuKey: blocks.map((x) => (judged(x) ? 1 : 0)).join(""),
    menu: blocks.map((x, index) => ({
      index,
      label: `${judged(x) ? "✓ " : ""}${x.id}  ${x.stories.map((n) => `#${n}`).join(" ")} · ${x.title}`,
    })),
    progress: `${verdicts.size}/${Object.keys(REVIEW.stories).length}`,
    blockId: b.id,
    note: notes.blocks[b.id]?.note ?? "",
    entries: notes.blocks[b.id]?.stories ?? {},
    general: notes.general,
    block: at,
    view,
    busy,
    scenario: `Scénář ${b.scenario.id}: ${b.scenario.title}`,
    title: `${b.id} ${b.title}`,
    stories: b.stories.map(story),
    look: b.look,
    views: b.views.map((v, i) => ({ label: v.label, seen: seen.has(`${b.id}/${i}`) })),
    log,
    mobile: harness?.mobile ?? false,
    lang: harness?.lang ?? "cs",
    nextLabel: !lastView
      ? "Další →"
      : at === blocks.length - 1
        ? "Hotovo – poslední zobrazení"
        : `Další blok ${blocks[at + 1].id} →`,
  })
}

async function onEdit(edit) {
  applyEdit(
    blocks.find((b) => b.id === edit.block),
    edit,
  )
  await render()
}

let printed = null
async function show(blockIndex, viewIndex) {
  at = blockIndex
  view = viewIndex
  const b = blocks[at]
  const v = b.views[view]
  log = []
  if (printed !== b.id) {
    printed = b.id
    console.log(`\n${C.bold(`── Blok ${b.id}: ${b.title}`)}`)
    for (const n of b.stories) console.log(`   ${C.green("story")} ${story(n).label}`)
    for (const line of b.look) console.log(`   • ${line}`)
  }
  saved.block = b.id
  save()
  await render()
  if (!v) return note("Tady není co klikat – posuďte podle bodů v panelu.")
  if (!data[b.scenario.id]) note(`Připravuji data scénáře ${b.scenario.id}…`)
  await ensureData(b.scenario)
  const d = data[b.scenario.id]
  log = []
  await harness.setMobile(v.mobile ?? harness.userMobile)
  await v.run(harness, d)
  seen.add(`${b.id}/${view}`)
  if (!log.some((l) => l.kind !== "info")) note("Připraveno – prohlížejte a klikejte v aplikaci.")
}

/** One action from the panel / terminal; others are ignored meanwhile. */
async function onAction(action, value) {
  if (busy) return
  busy = true
  const b = blocks[at]
  try {
    if (action === "view") await show(at, value)
    else if (action === "block") await show(value, 0)
    else if (action === "next") {
      if (view < b.views.length - 1) await show(at, view + 1)
      else if (at < blocks.length - 1) await show(at + 1, 0)
      else note("Tohle bylo poslední zobrazení. Zkontrolujte verdikty a ukončete skript (Ctrl+C).")
    } else if (action === "prev") {
      if (view > 0) await show(at, view - 1)
      else if (at > 0) await show(at - 1, Math.max(0, blocks[at - 1].views.length - 1))
    } else if (action === "mobile") {
      harness.userMobile = !harness.mobile
      await harness.setMobile(harness.userMobile)
    } else if (action === "lang") {
      await harness.setLanguage(harness.lang === "cs" ? "en" : "cs")
      await show(at, view)
    } else if (action === "reload") await show(at, view)
    else if (action === "fresh") {
      note(`Zakládám nová data scénáře ${b.scenario.id}…`)
      await pendingSeeds.get(b.scenario.id)?.catch(() => {})
      pendingSeeds.delete(b.scenario.id)
      delete data[b.scenario.id]
      await show(at, view)
    }
  } catch (e) {
    note(String(e.message).split("\n")[0], "error")
  } finally {
    busy = false
    await render()
  }
}

if (AUTO) {
  const shots = path.join(OUT_DIR, "shots")
  fs.rmSync(shots, { recursive: true, force: true })
  fs.mkdirSync(shots, { recursive: true })
  const failures = []
  harness = await Harness.launch({ headless: true, onMessage: note })
  panel = await Panel.launch({ headless: true, onAction, onEdit })
  for (const [i, b] of blocks.entries()) {
    for (const [j, v] of b.views.entries()) {
      busy = true
      try {
        await show(i, j)
        busy = false
        await sleep(700)
        const problems = log.filter((l) => l.kind === "error")
        if (problems.length)
          failures.push(`${b.id}/${j + 1} ${v.label}: ${problems.map((p) => p.text).join(" | ")}`)
      } catch (e) {
        busy = false
        failures.push(`${b.id}/${j + 1} ${v.label}: ${String(e.message).split("\n")[0]}`)
      }
      const name = `${b.id}-${j + 1}`
      await harness.page.screenshot({ path: path.join(shots, `${name}.png`) }).catch(() => {})
      console.log(
        C.dim(
          `   ${name} ${v.label}: ${log
            .filter((l) => l.kind === "info")
            .map((l) => l.text)
            .join(" · ")}`,
        ),
      )
    }
  }
  await render()
  await panel.page.screenshot({ path: path.join(shots, "panel.png") })
  console.log(
    failures.length
      ? C.red(`\nSelhalo ${failures.length}:\n${failures.join("\n")}`)
      : C.green("\nVšechna zobrazení proběhla."),
  )
  await shutdown(failures.length ? 1 : 0)
}

panel = await Panel.launch({ headless: false, onAction, onEdit })
harness = await Harness.launch({ headless: false, bounds: panel.appBounds, onMessage: note })
// Closing either window ends the whole run.
for (const part of [harness, panel]) {
  part.page.on("close", () => void shutdown(0))
  part.browser.on("disconnected", () => void shutdown(0))
}
console.log(
  `\n${C.bold("Ovládejte z levého okna.")} (Alternativa v terminálu: Enter = další, q = konec.) Konec: zavřete okno nebo stiskněte Ctrl+C.`,
)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl.on("line", (line) => void (line.trim() === "q" ? shutdown(0) : onAction("next")))
rl.on("SIGINT", () => void shutdown(0))
await onAction("block", at)
