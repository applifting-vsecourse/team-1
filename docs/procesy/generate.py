#!/usr/bin/env python3
"""YAML model -> Mermaid (kompatibilni s Mermaid 10.3.0).

Podporovane diagramy (klic `diagram`): process (vychozi, flowchart),
class (classDiagram), lifecycle (stateDiagram-v2).

Pouziti:
  python generate.py                 # zpracuje vsechny *.yaml ve slozce skriptu
  python generate.py model.yaml ...  # zpracuje zadane soubory
Vystup: <nazev>.mmd (cisty Mermaid) a <nazev>.md (stejny kod v ```mermaid bloku)
vedle zdrojoveho yaml.
"""
import re
import sys
import textwrap
from pathlib import Path

import yaml

# typ uzlu -> (otevirani, zavirani, trida)
SHAPES = {
    "event":   ("((", "))", "ev"),      # ad-hoc udalost (spoustec)
    "timed":   ("((", "))", "timed"),   # casovana udalost
    "task":    ("(", ")", "task"),      # ulohu provadi role
    "step":    ("(", ")", "task"),
    "process": ("[[", "]]", "proc"),    # business proces (mapa)
    "state":   ("([", "])", "st"),      # stav objektu / stav procesu
    "end":     ("([", "])", "endst"),   # koncovy stav
    "gateway": ("{", "}", "gw"),        # tridu urcuje kind (gw_xor / gw_and / gw_or)
    "note":    ("[", "]", "note"),
}
GW_KIND = {"x": "xor", "xor": "xor", "+": "and", "and": "and", "o": "or", "or": "or"}
GW_LABEL = {"xor": "XOR", "and": "AND", "or": "OR"}

STYLES = """\
  classDef ev fill:#ffffff,stroke:#333,stroke-width:1px
  classDef timed fill:#ffffff,stroke:#333,stroke-width:1px,stroke-dasharray:2 2
  classDef task fill:#ffffff,stroke:#333
  classDef proc fill:#e6fffa,stroke:#2c7a7b
  classDef st fill:#eef6ff,stroke:#2b6cb0
  classDef endst fill:#fde8e8,stroke:#c53030
  classDef gw_xor fill:#fff1d6,stroke:#c05621,stroke-width:2px
  classDef gw_and fill:#e3ecff,stroke:#2b4acb,stroke-width:2px
  classDef gw_or fill:#e2f7e8,stroke:#2f855a,stroke-width:2px
  classDef note fill:#fffbe6,stroke:#d69e2e,stroke-dasharray:3 3
  classDef unsure stroke-dasharray:4 3,stroke-width:2px,stroke:#d69e2e"""


def die(msg):
    sys.exit(f"CHYBA: {msg}")


def nid(raw):
    """Bezpecne ID pro Mermaid (bez diakritiky/pomlcek, vyhne se klicovym slovum)."""
    s = re.sub(r"\W", "_", str(raw))
    return "n_" + s


def esc(text, width=None):
    """Escapuje uvozovky; s `width` zalomi dlouhy text na vice radku (<br/>)."""
    text = str(text)
    if width:
        text = "\n".join(textwrap.wrap(text, width) or [""])
    return text.replace('"', "#quot;").replace("\n", "<br/>")


def gw_kind(n):
    k = str(n.get("kind", "x")).lower()
    if k not in GW_KIND:
        die(f"brana {n['id']}: neznamy kind '{k}' (povolene: x, +, o)")
    return GW_KIND[k]


def node_label(n):
    t = n.get("type", "task")
    if t == "gateway":
        return GW_LABEL[gw_kind(n)]
    parts = [esc(n.get("label", n["id"]), 22)]
    if n.get("role"):
        parts.append("role: " + esc(n["role"], 22))
    return "<br/>".join(parts)


REL_ARROWS = {
    "assoc": "--",
    "directed": "-->",
    "aggregation": "o--",
    "composition": "*--",
    "generalization": "<|--",
    "dependency": "..>",
}


def warn(msg):
    print(f"POZOR: {msg}", file=sys.stderr)


def generate_class(model):
    classes = model.get("classes") or []
    rels = model.get("relations") or []
    ids = {}
    for c in classes:
        if "id" not in c:
            die(f"trida bez id: {c}")
        if c["id"] in ids:
            die(f"duplicitni id tridy: {c['id']}")
        ids[c["id"]] = c
    out = ["classDiagram"]
    for c in classes:
        out.append(f'  class {nid(c["id"])}["{esc(c.get("label", c["id"]))}"] {{')
        if c.get("stereotype"):
            out.append(f'    <<{c["stereotype"]}>>')
        for a in c.get("attrs") or []:
            out.append(f"    {a}")
        for o in c.get("ops") or []:
            out.append(f"    {o}")
        out.append("  }")
    for i, r in enumerate(rels):
        t = r.get("type", "assoc")
        if t not in REL_ARROWS:
            die(f"vztah c.{i + 1}: neznamy typ '{t}' (povolene: {', '.join(REL_ARROWS)})")
        a, b = r.get("from"), r.get("to")
        for x in (a, b):
            if x not in ids:
                die(f"vztah c.{i + 1}: neznama trida '{x}'")
        # generalizace: from = specializace, to = nadrizena trida (sipka k obecnejsi)
        if t == "generalization":
            a, b = b, a
        lc = f' "{r["from_card"]}"' if r.get("from_card") and t != "generalization" else ""
        rc = f' "{r["to_card"]}"' if r.get("to_card") and t != "generalization" else ""
        lab = r.get("label")
        roles = [x for x in (r.get("from_role"), r.get("to_role")) if x]
        if roles and not lab:
            lab = " / ".join(roles)
        lab_s = f" : {esc(lab)}" if lab else ""
        out.append(f"  {nid(a)}{lc} {REL_ARROWS[t]}{rc} {nid(b)}{lab_s}")
        if r.get("assoc_class"):
            ac = r["assoc_class"]
            if ac not in ids:
                die(f"vztah c.{i + 1}: neznama asociacni trida '{ac}'")
            out.append(f"  {nid(a)} .. {nid(ac)}")
    return "\n".join(out) + "\n"


def generate_lifecycle(model):
    states = model.get("states") or []
    trans = model.get("transitions") or []
    ids = {}
    for s in states:
        if "id" not in s:
            die(f"stav bez id: {s}")
        if s["id"] in ids:
            die(f"duplicitni id stavu: {s['id']}")
        ids[s["id"]] = s
    out = ["stateDiagram-v2"]
    for s in states:
        out.append(f'  state "{esc(s.get("label", s["id"]))}" as {nid(s["id"])}')
    outgoing = {k: 0 for k in ids}
    for i, t in enumerate(trans):
        a, b = t.get("from"), t.get("to")
        for x in (a, b):
            if x not in ids and x not in ("start", "end"):
                die(f"prechod c.{i + 1}: neznamy stav '{x}'")
        if "reason" not in t:
            warn(f"prechod c.{i + 1} ({a} -> {b}) nema duvod (udalost nebo podminku)")
        if a in outgoing:
            outgoing[a] += 1
        src = "[*]" if a == "start" else nid(a)
        dst = "[*]" if b == "end" else nid(b)
        lab = str(t.get("reason", ""))
        if t.get("op"):
            lab += f" / {t['op']}"
        out.append(f"  {src} --> {dst}" + (f" : {esc(lab)}" if lab else ""))
    finals = {t["from"] for t in trans if t.get("to") == "end"}
    for k, n in outgoing.items():
        if k in finals or ids[k].get("final"):
            continue
        if n < 2:
            warn(f"stav '{k}' ma {n} odchozich prechodu (nekoncovy stav ma mit aspon 2, jinak hrozi deadlock)")
    return "\n".join(out) + "\n"


SYNC_SOURCES = {"task", "step", "state"}
SYNC_EVENTS = {"event", "timed"}


def add_sync_gateways(nodes, flows, groups):
    """Cekani na udalost: tok z ulohy/kroku/stavu do udalosti nahradi AND brana.

    task -> udalost -> dalsi   se kresli jako   task -> AND <- udalost, AND -> dalsi,
    aby bylo videt, ze se proces v AND brane zastavi, dokud nedorazi i udalost.
    Vypnuti u udalosti: `sync: false`.
    """
    by_id = {n["id"]: n for n in nodes}
    new_nodes, new_flows = list(nodes), []
    gw_of = {}
    for n in nodes:
        if n.get("type") not in SYNC_EVENTS or n.get("sync") is False:
            continue
        incoming = [f for f in flows if f.get("to") == n["id"]]
        if any(by_id.get(f.get("from"), {}).get("type", "task") in SYNC_SOURCES for f in incoming):
            gw_of[n["id"]] = "sync_" + str(n["id"])
    if not gw_of:
        return nodes, flows, groups
    for ev, gid in gw_of.items():
        new_nodes.append({"id": gid, "type": "gateway", "kind": "+"})
    for f in flows:
        a, b = f.get("from"), f.get("to")
        if b in gw_of:
            new_flows.append({**f, "to": gw_of[b]})
        elif a in gw_of:
            new_flows.append({**f, "from": gw_of[a]})
        else:
            new_flows.append(f)
    for ev, gid in gw_of.items():
        new_flows.append({"from": ev, "to": gid})
    new_groups = []
    for g in groups:
        members = list(g.get("members", []))
        members += [gw_of[m] for m in members if m in gw_of]
        new_groups.append({**g, "members": members})
    return new_nodes, new_flows, new_groups


def generate(model):
    kind = model.get("diagram", "process")
    if kind == "class":
        return generate_class(model)
    if kind == "lifecycle":
        return generate_lifecycle(model)
    if kind != "process":
        die(f"neznamy diagram '{kind}' (povolene: process, class, lifecycle)")
    nodes = model.get("nodes") or []
    flows = model.get("flows") or []
    groups = model.get("groups") or []
    known = {n.get("id") for n in nodes}
    for i, f in enumerate(flows):
        for x in (f.get("from"), f.get("to")):
            if x not in known:
                die(f"tok c.{i + 1}: neznamy uzel '{x}'")
    nodes, flows, groups = add_sync_gateways(nodes, flows, groups)
    by_id = {}
    for n in nodes:
        if "id" not in n:
            die(f"uzel bez id: {n}")
        if n["id"] in by_id:
            die(f"duplicitni id uzlu: {n['id']}")
        by_id[n["id"]] = n

    out = [f"flowchart {model.get('direction', 'TD')}", STYLES, ""]

    grouped = set()

    def emit_node(n, indent):
        t = n.get("type", "task")
        if t not in SHAPES:
            die(f"uzel {n['id']}: neznamy typ '{t}' (povolene: {', '.join(SHAPES)})")
        o, c, _ = SHAPES[t]
        out.append(f'{indent}{nid(n["id"])}{o}"{node_label(n)}"{c}')

    for g in groups:
        out.append(f'  subgraph {nid("grp_" + g["id"])}["{esc(g.get("label", g["id"]))}"]')
        for m in g.get("members", []):
            if m not in by_id:
                die(f"skupina {g['id']}: neznamy uzel '{m}'")
            emit_node(by_id[m], "    ")
            grouped.add(m)
        out.append("  end")
    for n in nodes:
        if n["id"] not in grouped:
            emit_node(n, "  ")
    out.append("")

    for i, f in enumerate(flows):
        a, b = f.get("from"), f.get("to")
        for x in (a, b):
            if x not in by_id:
                die(f"tok c.{i + 1}: neznamy uzel '{x}'")
        arrow = "-.->" if f.get("dashed") else "-->"
        lab = f.get("label")
        lab_s = f'|"{esc(lab, 24)}"|' if lab else ""
        out.append(f"  {nid(a)} {arrow}{lab_s} {nid(b)}")
    out.append("")

    classes = {}
    for n in nodes:
        cls = SHAPES[n.get("type", "task")][2]
        if cls == "gw":
            cls = "gw_" + gw_kind(n)
        classes.setdefault(cls, []).append(nid(n["id"]))
        if n.get("unsure"):
            classes.setdefault("unsure", []).append(nid(n["id"]))
    for cls, ids in classes.items():
        out.append(f"  class {','.join(ids)} {cls}")

    return "\n".join(out) + "\n"


def process(path):
    model = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    code = generate(model)
    path.with_suffix(".mmd").write_text(code, encoding="utf-8")
    title = model.get("title", path.stem)
    md = f"# {title}\n\n```mermaid\n{code}```\n"
    path.with_suffix(".md").write_text(md, encoding="utf-8")
    print(f"OK {path.name} -> {path.stem}.mmd, {path.stem}.md")


def main():
    args = sys.argv[1:]
    files = [Path(a) for a in args] or sorted(Path(__file__).parent.glob("*.yaml"))
    if not files:
        die("zadne *.yaml k zpracovani")
    for f in files:
        process(f)


if __name__ == "__main__":
    main()