// Kontrola syntaxe Mermaid souboru parserem Mermaid 10.3.0 (stejná verze, na kterou cílí generate.py).
// Spouštěj přes check_mermaid.sh, který se postará o instalaci závislostí.
import { JSDOM } from "jsdom";
import fs from "fs";

const dom = new JSDOM("<!doctype html><body></body>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const mermaid = (await import("mermaid")).default;

let failed = false;
for (const file of process.argv.slice(2)) {
  try {
    await mermaid.parse(fs.readFileSync(file, "utf8"));
    console.log("OK  ", file);
  } catch (e) {
    failed = true;
    console.log("CHYBA", file);
    console.log(String(e.message || e).split("\n").slice(0, 6).join("\n"));
  }
}
process.exit(failed ? 1 : 0);
