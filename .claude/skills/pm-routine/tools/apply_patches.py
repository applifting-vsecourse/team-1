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

LABEL = re.compile(r"^(?:\(\d\) )?(Nahradit|Vložit za řádek|Novým):$")
FENCE = re.compile(r"^(`{3,})(\w*)\s*$")
report = []


def is_close(ln, fence):
    """Konec bloku: řádek jen z backticků, aspoň tak dlouhý jako otevírací plot (CommonMark)."""
    t = ln.strip()
    return t.startswith(fence) and set(t) == {"`"}


def split_items(src):
    """Položky `### …` mimo oplocené bloky; `###` uvnitř bloku je text patche."""
    items, cur, fence = [], None, None
    for ln in src.splitlines(keepends=True):
        if fence is None and ln.startswith("### "):
            cur = [ln[4:]]
            items.append(cur)
            continue
        if fence is None and FENCE.match(ln):
            fence = FENCE.match(ln).group(1)
        elif fence is not None and is_close(ln, fence):
            fence = None
        if cur is not None:
            cur.append(ln)
    return ["".join(c) for c in items]


def parse_item(it):
    """(podmínka, [(label, text)]) nebo None, když blok chybí nebo není uzavřený.

    Text bloku může obsahovat vlastní ``` bloky; pak má vnější plot víc backticků (````text)."""
    lines = it.splitlines()
    cond, blocks, i = None, [], 1
    while i < len(lines):
        ln = lines[i]
        lab = LABEL.match(ln)
        if lab:
            m = FENCE.match(lines[i + 1]) if i + 1 < len(lines) else None
            if not m:
                return None
            fence, body, j = m.group(1), [], i + 2
            while j < len(lines) and not is_close(lines[j], fence):
                body.append(lines[j])
                j += 1
            if j == len(lines):
                return None
            blocks.append((lab.group(1), "\n".join(body)))
            i = j + 1
            continue
        if ln.startswith("Podmínka: "):
            cond = ln[len("Podmínka: "):]
        elif FENCE.match(ln):  # jiný blok mimo operace (ukázka): přeskočit celý
            fence = FENCE.match(ln).group(1)
            i += 1
            while i < len(lines) and not is_close(lines[i], fence):
                i += 1
        i += 1
    return cond, blocks


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
        parsed = parse_item(it)
        if parsed is None:
            report.append(f"FAIL-PARSE {target} | {title}")
            continue
        cond, blocks = parsed
        if cond and any(s in cond for s in SKIP_COND):
            report.append(f"SKIP-COND {target} | {title} | {cond[:80]}")
            continue
        ops, cur = [], None
        for label, body in blocks:
            if label != "Novým":
                cur = [label, body]
            elif cur is None:
                ops = None
                break
            else:
                ops.append((cur[0], cur[1], body))
                cur = None
        if cur is not None:  # anchor without its „Novým“ block: reject the whole item
            ops = None
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
