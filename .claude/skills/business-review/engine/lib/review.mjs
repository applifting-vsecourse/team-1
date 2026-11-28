// Data of one review: review.json + scenarios from the run folder.
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { RUN_DIR } from "./env.mjs"
import * as api from "./api.mjs"
import * as seed from "./seed.mjs"
import { db } from "./db.mjs"

export const REVIEW = JSON.parse(fs.readFileSync(path.join(RUN_DIR, "review.json"), "utf8"))

export function story(n) {
  const s = REVIEW.stories[n]
  if (!s) throw new Error(`#${n} chybí v review.json`)
  return { n, title: s.title, note: s.note ?? "", label: `#${n} ${s.title}` }
}

/** A scenario is `export default (kit) => ({ id, title, seed?, blocks })`, so it needs no engine paths. */
export async function loadScenarios() {
  const dir = path.join(RUN_DIR, "scenarios")
  const kit = { ...api, ...seed, db }
  const out = []
  for (const f of fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mjs"))
    .sort())
    out.push((await import(pathToFileURL(path.join(dir, f)).href)).default(kit))
  if (!out.length) throw new Error(`Žádné scénáře v ${dir}`)
  // Tickets with nothing to click are blocks without views, judged in the same panel.
  if (REVIEW.extra?.length)
    out.push({
      id: "K",
      title: "Bez klikání",
      blocks: REVIEW.extra.map((b, i) => ({ look: [], ...b, id: `K.${i + 1}`, views: [] })),
    })
  const covered = new Set(out.flatMap((s) => s.blocks.flatMap((b) => b.stories.map(Number))))
  const missing = Object.keys(REVIEW.stories)
    .map(Number)
    .filter((n) => !covered.has(n))
  if (missing.length)
    throw new Error(
      `Tickety bez bloku (přidejte do scénáře nebo do "extra"): ${missing.map((n) => `#${n}`).join(", ")}`,
    )
  return out
}
