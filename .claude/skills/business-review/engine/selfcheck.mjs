// Checks the panel and note saving without the app or data: `node selfcheck.mjs` from the repo root.
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "br-check-"))
process.argv.push("--run", dir)
const { Panel } = await import("./lib/panel.mjs")
const { NOTES_FILE, notes, applyEdit } = await import("./lib/notes.mjs")

const block = { id: "1.1", title: "Blok", stories: [7] }
const actions = []
let panel
const render = () =>
  panel.render({
    menuKey: "0",
    menu: [{ index: 0, label: "1.1" }],
    progress: "0/1",
    block: 0,
    view: 0,
    busy: false,
    scenario: "S",
    title: "1.1 Blok",
    blockId: block.id,
    note: notes.blocks["1.1"]?.note ?? "",
    entries: notes.blocks["1.1"]?.stories ?? {},
    general: notes.general,
    stories: [{ n: 7, title: "Ticket", note: "" }],
    look: [],
    views: [],
    log: [],
    mobile: false,
    lang: "cs",
    nextLabel: "Další",
  })
panel = await Panel.launch({
  headless: true,
  onAction: (a) => actions.push(a),
  onEdit: async (edit) => {
    applyEdit(block, edit)
    await render()
  },
})
try {
  await render()
  const { page } = panel
  const done = page.getByRole("button", { name: "Done #7" })
  const saved = () => JSON.parse(fs.readFileSync(NOTES_FILE, "utf8"))
  await done.click()
  await page.getByRole("button", { name: "Bug #7" }).click()
  // Shortcuts must not fire while typing and a re-render must not wipe the text.
  await page.locator("#note").pressSequentially("mer chyba")
  await page.waitForTimeout(300)
  assert.deepEqual(saved().blocks["1.1"], {
    title: "Blok",
    note: "mer chyba",
    stories: { 7: { verdict: "done", tags: ["bug"] } },
  })
  assert.equal(await page.locator("#note").inputValue(), "mer chyba")
  assert.equal(await done.getAttribute("aria-pressed"), "true")
  assert.deepEqual(actions, [])
  await done.click()
  await page.waitForTimeout(300)
  assert.equal(saved().blocks["1.1"].stories[7].verdict, "")
  console.log("OK")
} finally {
  await panel.close()
  fs.rmSync(dir, { recursive: true, force: true })
}
