"""Doslovné patche dokumentů z fáze 2 PM rutiny (viz ../agenti.md, „Formát patche“).

Usage: python3 -I apply_patches.py <patch_dir> <repo> [--dry] [--skip <text>]...

Každý soubor <patch_dir>/*.patch.md začíná řádkem `# Patche: <cesta v repu>`. Položka `### …` obsahuje
dvojice bloků `Nahradit:` / `Vložit za řádek:` a `Novým:` (```text). Kotva musí v dokumentu stát právě
jednou, jinak se položka přeskočí (FAIL-COUNT). Položka s řádkem `Podmínka: …`, který obsahuje některý
`--skip` text, se přeskočí (SKIP-COND). Žádné přeformulování, jen doslovná náhrada.
"""
import re
import sys
from pathlib import Path

args = sys.argv[1:]
DRY = "--dry" in args
SKIP_COND = [args[i + 1] for i, a in enumerate(args) if a == "--skip" and i + 1 < len(args)]
pos = [a for i, a in enumerate(args) if not a.startswith("--") and (i == 0 or args[i - 1] != "--skip")]
PDIR, REPO = Path(pos[0]), Path(pos[1])

OP = re.compile(r"(?m)^(?:\(\d\) )?(Nahradit|Vložit za řádek|Novým):\n```text\n(.*?)\n```", re.S)
report = []


def split_items(src):
    """Položky `### …` mimo oplocené bloky; `###` uvnitř ```text bloku je text patche."""
    items, cur, fenced = [], None, False
    for ln in src.splitlines(keepends=True):
        if ln.startswith("```"):
            fenced = not fenced
        if not fenced and ln.startswith("### "):
            cur = [ln[4:]]
            items.append(cur)
        elif cur is not None:
            cur.append(ln)
    return ["".join(c) for c in items]

for pfile in sorted(PDIR.glob("*.patch.md")):
    src = pfile.read_text()
    head = re.match(r"# Patche: (\S+)", src)
    if not head:
        report.append(f"FAIL-HEAD {pfile.name} (chybí řádek '# Patche: <cesta>')")
        continue
    target = head.group(1)
    doc_path = REPO / target
    doc = doc_path.read_text()
    for it in split_items(src):
        title = it.splitlines()[0]
        cond = re.search(r"(?m)^Podmínka: (.*)$", it)
        if cond and any(s in cond.group(1) for s in SKIP_COND):
            report.append(f"SKIP-COND {target} | {title} | {cond.group(1)[:80]}")
            continue
        ops, cur = [], None
        for m in OP.finditer(it):
            label, body = m.group(1), m.group(2)
            if label != "Novým":
                cur = [label, body]
            elif cur is None:
                ops = None
                break
            else:
                ops.append((cur[0], cur[1], body))
                cur = None
        if not ops:
            report.append(f"FAIL-PARSE {target} | {title}")
            continue
        new_doc, ok = doc, True
        for label, anchor, body in ops:
            n = new_doc.count(anchor)
            if n != 1:
                report.append(f"FAIL-COUNT={n} {target} | {title} | {anchor[:60]!r}")
                ok = False
                break
            if label == "Nahradit":
                new_doc = new_doc.replace(anchor, body, 1)
            else:
                i = new_doc.index(anchor) + len(anchor)
                eol = new_doc.find("\n", i)
                eol = len(new_doc) if eol == -1 else eol
                new_doc = new_doc[:eol] + "\n" + body + new_doc[eol:]
        if ok:
            doc = new_doc
            report.append(f"OK {target} | {title} | {len(ops)} op")
    if not DRY:
        doc_path.write_text(doc)

print("\n".join(report))
print("OK", sum(r.startswith("OK") for r in report), "| SKIP", sum(r.startswith("SKIP") for r in report),
      "| FAIL", sum(r.startswith("FAIL") for r in report))
