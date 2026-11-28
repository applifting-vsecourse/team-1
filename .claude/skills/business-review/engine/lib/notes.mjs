// Verdicts and notes from the panel: <run>/notes.json. It is the output of the review, hence the atomic write.
import fs from "node:fs"
import path from "node:path"
import { RUN_DIR } from "./env.mjs"

export const NOTES_FILE = path.join(RUN_DIR, "notes.json")
// A corrupt file crashes the start (JSON.parse) so the next write cannot overwrite it.
export const notes = fs.existsSync(NOTES_FILE)
  ? JSON.parse(fs.readFileSync(NOTES_FILE, "utf8"))
  : { blocks: {}, general: "" }

/** field: "note" | "general" | "verdict" | "tag"; choosing the same verdict or tag again clears it. */
export function applyEdit(block, { story, field, value }) {
  if (field === "general") notes.general = value
  else {
    const entry = (notes.blocks[block.id] ??= { title: block.title, note: "", stories: {} })
    for (const n of block.stories) entry.stories[n] ??= { verdict: "", tags: [] }
    if (field === "note") entry.note = value
    else {
      const s = entry.stories[story]
      if (field === "verdict") s.verdict = s.verdict === value ? "" : value
      else s.tags = s.tags.includes(value) ? s.tags.filter((t) => t !== value) : [...s.tags, value]
    }
  }
  fs.writeFileSync(`${NOTES_FILE}.tmp`, JSON.stringify(notes, null, 2))
  fs.renameSync(`${NOTES_FILE}.tmp`, NOTES_FILE)
}
