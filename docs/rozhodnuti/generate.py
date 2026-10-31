"""rozhodnuti.yaml -> README.md (registr rozhodnutí) + validace.

    pip install pyyaml
    python generate.py          # validuje a přegeneruje README.md
    python generate.py --check  # jen validace; selže, když README.md neodpovídá YAML

README.md needituj, měň jen rozhodnuti.yaml. Schéma a pravidla: viz SCHEMA.md.
"""
import sys
from collections import defaultdict
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
TYPY = ["byznys", "produkt", "design", "technicke", "proces"]
STAVY = ["navrh", "platne", "nahrazene", "zrusene"]
STAV_POPIS = {"navrh": "návrh, čeká na PM", "platne": "platné", "nahrazene": "nahrazené", "zrusene": "zrušené"}
KDO_NAD = {"tym"}  # krome rolí z registru otázek


def load():
    d = yaml.safe_load((HERE / "rozhodnuti.yaml").read_text(encoding="utf-8"))
    q = yaml.safe_load((HERE.parent / "otevrene-otazky" / "otazky.yaml").read_text(encoding="utf-8"))
    return d["rozhodnuti"], q


def validate(dec, q):
    errors = []
    roles = set(q["role"]) | KDO_NAD
    qids = {o["id"] for o in q["otazky"]}
    ids = [d["id"] for d in dec]
    by = {d["id"]: d for d in dec}
    for i in {x for x in ids if ids.count(x) > 1}:
        errors.append(f"{i}: duplicitní ID")

    def exists(path):
        return (REPO / path).exists()

    for d in dec:
        i = d["id"]
        if d.get("typ") not in TYPY:
            errors.append(f"{i}: neznámý typ {d.get('typ')!r}")
        if d.get("stav") not in STAVY:
            errors.append(f"{i}: neznámý stav {d.get('stav')!r}")
        for k in ("nazev", "text", "oblast"):
            if not d.get(k):
                errors.append(f"{i}: chybí {k}")
        if d.get("stav") != "navrh":
            if not d.get("rozhodl"):
                errors.append(f"{i}: chybí rozhodl")
            for r in d.get("rozhodl") or []:
                if r not in roles:
                    errors.append(f"{i}: rozhodl {r!r} není role")
        elif d.get("navrhl") and d["navrhl"] not in roles:
            errors.append(f"{i}: navrhl {d['navrhl']!r} není role")
        if not d.get("zdroj"):
            errors.append(f"{i}: chybí zdroj")
        if d.get("datum") is None and not any(z.get("popis", "").startswith("board") for z in d.get("zdroj") or []):
            errors.append(f"{i}: datum může být prázdné jen u rozhodnutí z boardu")
        for z in d.get("zdroj") or []:
            if z.get("soubor") and not exists(z["soubor"]):
                errors.append(f"{i}: zdroj ukazuje na neexistující soubor {z['soubor']}")
        for t in d.get("dokumentace") or []:
            if t.get("stav") not in ("ceka", "hotovo"):
                errors.append(f"{i}: dokumentace {t.get('soubor')}: stav musí být ceka nebo hotovo")
            if t.get("stav") == "hotovo" and not t.get("commit"):
                errors.append(f"{i}: dokumentace {t.get('soubor')} je hotovo bez commitu")
            if not exists(t["soubor"]):
                errors.append(f"{i}: dokumentace ukazuje na neexistující soubor {t['soubor']}")
        # řetězce změn
        if d.get("stav") == "nahrazene" and not d.get("nahrazeno_v"):
            errors.append(f"{i}: nahrazené rozhodnutí potřebuje nahrazeno_v")
        if d.get("stav") == "zrusene" and not d.get("duvod"):
            errors.append(f"{i}: zrušené rozhodnutí potřebuje duvod")
        if d.get("nahrazeno_v"):
            n = by.get(d["nahrazeno_v"])
            if not n:
                errors.append(f"{i}: nahrazeno_v ukazuje na neexistující {d['nahrazeno_v']}")
            elif i not in (n.get("nahrazuje") or []):
                errors.append(f"{i}: {n['id']} musí mít {i} v nahrazuje")
            elif d.get("datum") and n.get("datum") and str(n["datum"]) < str(d["datum"]):
                errors.append(f"{i}: nástupce {n['id']} je starší než nahrazené")
        for n in d.get("nahrazuje") or []:
            o = by.get(n)
            if not o:
                errors.append(f"{i}: nahrazuje neexistující {n}")
            elif o.get("nahrazeno_v") != i:
                errors.append(f"{i}: {n} musí mít nahrazeno_v: {i}")
        for n in d.get("meni") or []:
            o = by.get(n)
            if not o:
                errors.append(f"{i}: meni neexistující {n}")
            elif i not in (o.get("zmeneno_v") or []):
                errors.append(f"{i}: {n} musí mít {i} v zmeneno_v")
        for n in d.get("zmeneno_v") or []:
            o = by.get(n)
            if not o:
                errors.append(f"{i}: zmeneno_v neexistující {n}")
            elif i not in (o.get("meni") or []):
                errors.append(f"{i}: {n} musí mít {i} v meni")
        # otázky
        for qid in d.get("z_otazek") or []:
            if qid not in qids:
                errors.append(f"{i}: z_otazek ukazuje na neexistující {qid}")
    # křížová kontrola s otázkami
    for o in q["otazky"]:
        ref = o.get("rozhodnuti_ref")
        if ref:
            d = by.get(ref)
            if not d:
                errors.append(f"{o['id']}: rozhodnuti_ref ukazuje na neexistující {ref}")
            elif o["id"] not in (d.get("z_otazek") or []):
                errors.append(f"{ref}: musí mít {o['id']} v z_otazek")
    return errors


def esc(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def src(z):
    t = z.get("popis", "zdroj")
    if z.get("url"):
        return f"[{t}]({z['url']})"
    if z.get("soubor"):
        return f"[{t}](../../{z['soubor']})"
    return t


def table(rows, head):
    if not rows:
        return "_Nic._\n"
    return "\n".join(["| " + " | ".join(head) + " |", "| " + " | ".join("---" for _ in head) + " |"] + rows) + "\n"


def link(did):
    return f"[{did}](#{did.lower()})"


def row(d, extra=()):
    return "| " + " | ".join([link(d["id"]), esc(d["nazev"]), str(d.get("datum") or "board"),
                              ", ".join(f"`{r}`" for r in d.get("rozhodl") or []) or "–", *extra]) + " |"


def render(dec, q):
    by = {d["id"]: d for d in dec}
    out = ["# Registr rozhodnutí", "",
           "> Generováno z [`rozhodnuti.yaml`](rozhodnuti.yaml) (`python generate.py`). Needituj, měň YAML.", ""]
    live = [d for d in dec if d["stav"] == "platne"]
    out += [f"**{len(live)} platných**, {sum(d['stav'] == 'navrh' for d in dec)} návrhů, "
            f"{sum(d['stav'] in ('nahrazene', 'zrusene') for d in dec)} nahrazených nebo zrušených.", ""]

    nav = [d for d in dec if d["stav"] == "navrh"]
    out += ["## Návrhy čekající na PM", "", table([row(d, [f"`{d.get('navrhl', '–')}`"]) for d in nav],
                                                   ["ID", "Rozhodnutí", "Datum", "Rozhodl", "Navrhl"])]

    nezap = [(d, t) for d in dec if d["stav"] in ("platne", "navrh") for t in d.get("dokumentace") or [] if t["stav"] == "ceka"]
    out += ["## Nezapsaný dopad na dokumentaci", "",
            table([f"| {link(d['id'])} | {esc(d['nazev'])} | `{t['soubor']}` | {esc(t.get('popis', ''))} |" for d, t in nezap],
                  ["ID", "Rozhodnutí", "Soubor", "Co zapsat"])]

    chains = [d for d in dec if d.get("nahrazuje") or d.get("meni")]
    out += ["## Změny dřívějších rozhodnutí", "",
            table([f"| {link(d['id'])} | {esc(d['nazev'])} | {str(d.get('datum') or 'board')} | "
                   + ", ".join(f"nahrazuje {link(x)}" for x in d.get("nahrazuje") or [])
                   + ", ".join(f"mění {link(x)}" for x in d.get("meni") or []) + " |" for d in chains],
                  ["ID", "Rozhodnutí", "Datum", "Vztah"])]

    out += ["## Platná rozhodnutí podle oblasti", ""]
    obl = defaultdict(list)
    for d in live:
        obl[d["oblast"]].append(d)
    for o in sorted(obl):
        out += [f"### {o}", "", table([row(d, [d["typ"]]) for d in sorted(obl[o], key=lambda x: (str(x.get('datum') or ''), x['id']), reverse=True)],
                                      ["ID", "Rozhodnutí", "Datum", "Rozhodl", "Typ"])]

    old = [d for d in dec if d["stav"] in ("nahrazene", "zrusene")]
    out += ["## Nahrazená a zrušená", "",
            table([row(d, [link(d["nahrazeno_v"]) if d.get("nahrazeno_v") else esc(d.get("duvod", ""))]) for d in old],
                  ["ID", "Rozhodnutí", "Datum", "Rozhodl", "Nahrazeno / důvod"])]

    out += ["## Detail", ""]
    for d in dec:
        out += [f'<a id="{d["id"].lower()}"></a>', "", f"### {d['id']} – {d['nazev']}", "",
                f"- **Stav:** {STAV_POPIS[d['stav']]} · **Typ:** {d['typ']} · **Oblast:** {d['oblast']}",
                f"- **Datum:** {d.get('datum') or 'board (bez data)'}"
                + (f" · **Rozhodl:** {', '.join(f'`{r}`' for r in d['rozhodl'])}" if d.get("rozhodl") else "")
                + (f" · **Navrhl:** `{d['navrhl']}`" if d.get("navrhl") else ""),
                f"- **Text:** {d['text']}"]
        if d.get("us"):
            out.append("- **Dotčené US:** " + ", ".join(f"[{u['label']}]({u['url']})" for u in d["us"]))
        out.append("- **Zdroj:** " + "; ".join(src(z) for z in d["zdroj"]))
        for k, label in (("nahrazuje", "Nahrazuje"), ("nahrazeno_v", "Nahrazeno v"), ("meni", "Mění"), ("zmeneno_v", "Změněno v")):
            v = d.get(k)
            if v:
                out.append(f"- **{label}:** " + ", ".join(link(x) for x in ([v] if isinstance(v, str) else v)))
        if d.get("z_otazek"):
            out.append("- **Z otázek:** " + ", ".join(f"`{x}`" for x in d["z_otazek"]))
        for t in d.get("dokumentace") or []:
            out.append(f"- **Dokumentace:** `{t['soubor']}`: {t['stav']}" + (f" ({t['commit']})" if t.get("commit") else "")
                       + (f", {t['popis']}" if t.get("popis") else ""))
        if d.get("duvod"):
            out.append(f"- **Důvod zrušení:** {d['duvod']}")
        if d.get("poznamka"):
            out.append(f"- **Poznámka:** {d['poznamka']}")
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def main():
    dec, q = load()
    errors = validate(dec, q)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(1)
    text = render(dec, q)
    target = HERE / "README.md"
    if "--check" in sys.argv:
        if not target.exists() or target.read_text(encoding="utf-8") != text:
            print("README.md neodpovídá rozhodnuti.yaml, spusť python generate.py", file=sys.stderr)
            sys.exit(1)
        return
    target.write_text(text, encoding="utf-8")
    print(f"OK, {len(dec)} rozhodnutí")


if __name__ == "__main__":
    main()
