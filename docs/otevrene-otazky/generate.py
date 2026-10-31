"""otazky.yaml -> README.md (přehled otevřených otázek) + validace.

    pip install pyyaml
    python generate.py          # validuje a přegeneruje README.md
    python generate.py --check  # jen validace; selže, když README.md neodpovídá YAML

README.md needituj, měň jen otazky.yaml. Schéma a pravidla: viz SCHEMA.md.
"""
import sys
from collections import defaultdict
from pathlib import Path

import yaml

HERE = Path(__file__).parent
STAVY = ["otevreno", "rozhodnuto", "zapsano", "uzavreno"]
PRIORITY = ["P0", "P1", "P2", "P3"]
STAV_POPIS = {
    "otevreno": "otevřeno",
    "rozhodnuto": "rozhodnuto, nezapsáno",
    "zapsano": "zapsáno v dokumentaci",
    "uzavreno": "uzavřeno",
}


def load():
    return yaml.safe_load((HERE / "otazky.yaml").read_text(encoding="utf-8"))


def validate(data):
    errors = []
    roles = data.get("role") or {}
    otazky = data["otazky"]
    ids = [o["id"] for o in otazky]
    for i in {x for x in ids if ids.count(x) > 1}:
        errors.append(f"{i}: duplicitní ID")
    idset = set(ids)
    for o in otazky:
        i = o["id"]
        if o.get("stav") not in STAVY:
            errors.append(f"{i}: neznámý stav {o.get('stav')!r}")
        if o.get("ceka_na") not in roles:
            errors.append(f"{i}: ceka_na {o.get('ceka_na')!r} není role")
        if o.get("priorita") not in PRIORITY + [None]:
            errors.append(f"{i}: neznámá priorita {o.get('priorita')!r}")
        if o.get("stav") != "uzavreno" and not o.get("priorita"):
            errors.append(f"{i}: neuzavřená otázka potřebuje prioritu")
        if o.get("duplikat_z") and o["duplikat_z"] not in idset:
            errors.append(f"{i}: duplikat_z ukazuje na neexistující {o['duplikat_z']}")
        if not o.get("zdroje") and o.get("stav") != "uzavreno":
            errors.append(f"{i}: chybí zdroj")
        r = o.get("rozhodnuti")
        if o.get("stav") in ("rozhodnuto", "zapsano"):
            if not r or not all(r.get(k) for k in ("text", "rozhodl", "datum")):
                errors.append(f"{i}: stav {o['stav']} vyžaduje rozhodnuti.text, rozhodl a datum")
            elif r["rozhodl"] not in roles:
                errors.append(f"{i}: rozhodnuti.rozhodl {r['rozhodl']!r} není role")
        if o.get("stav") == "zapsano":
            dok = o.get("dokumentace") or []
            if not dok or any(x.get("stav") != "hotovo" or not x.get("commit") for x in dok):
                errors.append(f"{i}: zapsano vyžaduje dokumentaci, vše ve stavu hotovo s commitem")
        if o.get("stav") == "uzavreno" and not (o.get("uzavreno_duvod") or o.get("rozhodnuti")):
            errors.append(f"{i}: uzavřená otázka potřebuje uzavreno_duvod nebo rozhodnuti")
    return errors


def esc(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def us_links(o):
    return ", ".join(f"[{u['label']}]({u['url']})" for u in o.get("us") or []) or "–"


def anchor(i):
    return i.lower()


def row(o, extra=None):
    dup = f" **Duplicita s [{o['duplikat_z']}](#{anchor(o['duplikat_z'])}).**" if o.get("duplikat_z") else ""
    cells = [f"[{o['id']}](#{anchor(o['id'])})", esc(o["otazka"]) + dup, us_links(o)]
    cells += extra or []
    return "| " + " | ".join(cells) + " |"


def table(rows, head):
    if not rows:
        return "_Nic._\n"
    sep = "| " + " | ".join("---" for _ in head) + " |"
    return "\n".join(["| " + " | ".join(head) + " |", sep] + rows) + "\n"


def sort_key(o):
    return (PRIORITY.index(o["priorita"]) if o.get("priorita") else 9, o["id"])


def render(data):
    roles = data["role"]
    otazky = data["otazky"]
    out = ["# Otevřené otázky", "",
           "> Generováno z [`otazky.yaml`](otazky.yaml) (`python generate.py`). Needituj, měň YAML.", ""]
    live = [o for o in otazky if o["stav"] != "uzavreno"]
    out += [f"**{len(live)} neuzavřených** otázek, **{len(otazky) - len(live)} uzavřených**.", ""]

    out += ["## Role", "",
            table([f"| `{k}` | {esc(v['popis'])} | {esc(v['jmeno'])} | {v.get('github') or '–'} |" for k, v in roles.items()],
                  ["Role", "Popis", "Kdo", "GitHub"])]

    out += ["## Kdo má tah", ""]
    for k, v in roles.items():
        mine = sorted([o for o in live if o["ceka_na"] == k and o["stav"] == "otevreno"], key=sort_key)
        out += [f"### `{k}` ({v['jmeno']}): {len(mine)}", "",
                table([row(o, [o["priorita"], esc(o.get("priorita_duvod", ""))]) for o in mine],
                      ["ID", "Otázka", "Dotčené US", "Priorita", "Proč"])]

    nezapsano = [o for o in otazky if o["stav"] == "rozhodnuto"]
    out += ["## Rozhodnuto, ale nezapsáno v dokumentaci", "",
            table([row(o, [esc(o["rozhodnuti"]["text"]), ", ".join(
                f"`{x['soubor']}`" for x in o.get("dokumentace") or [] if x.get("stav") != "hotovo") or "–"])
                for o in nezapsano], ["ID", "Otázka", "Dotčené US", "Rozhodnutí", "Zapsat do"])]

    out += ["## Podle epiců", ""]
    epics = defaultdict(list)
    for o in live:
        epics[o["epic"]].append(o)
    for e in sorted(epics):
        out += [f"### Epic: {e}", "",
                table([row(o, [STAV_POPIS[o["stav"]], o["priorita"], f"`{o['ceka_na']}`"])
                       for o in sorted(epics[e], key=sort_key)],
                      ["ID", "Otázka", "Dotčené US", "Stav", "Priorita", "Čeká na"])]

    zav = [o for o in otazky if o["stav"] == "uzavreno"]
    out += ["## Uzavřeno", "",
            table([row(o, [esc(o.get("uzavreno_duvod") or o["rozhodnuti"]["text"])]) for o in zav],
                  ["ID", "Otázka", "Dotčené US", "Důvod"])]

    out += ["## Detail", ""]
    for o in sorted(otazky, key=lambda x: x["id"]):
        out += [f'<a id="{anchor(o["id"])}"></a>', "", f"### {o['id']} – {o['otazka']}", "",
                f"- **Epic:** {o['epic']} · **Dotčené US:** {us_links(o)} · **Stav:** {STAV_POPIS[o['stav']]}"
                f" · **Čeká na:** `{o['ceka_na']}`"]
        if o.get("duplikat_z"):
            out.append(f"- **Duplicita s:** [{o['duplikat_z']}](#{anchor(o['duplikat_z'])})")
        if o.get("poznamka"):
            out.append(f"- **Poznámka:** {o['poznamka']}")
        if o.get("zdroje"):
            out.append("- **Zdroje:**")
            for z in o["zdroje"]:
                link = f"[{z['popis']}]({z['url']})" if z.get("url") else z["popis"]
                out.append(f"  - {link}" + (f": {z['citace']}" if z.get("citace") else ""))
        if o.get("priorita"):
            out.append(f"- **Priorita:** {o['priorita']} – {o.get('priorita_duvod', '')}")
        r = o.get("rozhodnuti")
        if r:
            out.append(f"- **Rozhodnutí:** {r['text']} ({r['rozhodl']}, {r['datum']}"
                       + (f", [zdroj]({r['zdroj']})" if r.get("zdroj") else "") + ")")
        for x in o.get("dokumentace") or []:
            out.append(f"- **Dokumentace:** `{x['soubor']}`: {x['stav']}" + (f" ({x['commit']})" if x.get("commit") else ""))
        if o.get("uzavreno_duvod"):
            out.append(f"- **Uzavřeno, protože:** {o['uzavreno_duvod']}")
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def main():
    data = load()
    errors = validate(data)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(1)
    text = render(data)
    target = HERE / "README.md"
    if "--check" in sys.argv:
        if not target.exists() or target.read_text(encoding="utf-8") != text:
            print("README.md neodpovídá otazky.yaml, spusť python generate.py", file=sys.stderr)
            sys.exit(1)
        return
    target.write_text(text, encoding="utf-8")
    print(f"OK, {len(data['otazky'])} otázek")


main()
