import html, re, sys, json
from pathlib import Path

"""REPORT.md + DETAIL.md -> REPORT.html (Ano/Změnit u každého nálezu). Usage: gen_html.py <OUT> ["Titulek"]"""
OUT = Path(sys.argv[1])
TITLE = sys.argv[2] if len(sys.argv) > 2 else "PM rutina Togena"
KEY = "togena-pm-" + OUT.name
report = (OUT / "REPORT.md").read_text()
detail = (OUT / "DETAIL.md").read_text()


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w/])#(\d{2,4})\b", r'<a href="https://github.com/applifting-vsecourse/team-1/issues/\1" target="_blank" rel="noopener">#\1</a>', s)
    return s


def md_block(lines):
    out, in_ul = [], False
    for ln in lines:
        if re.match(r"^\s*[-*] ", ln):
            if not in_ul:
                out.append("<ul>"); in_ul = True
            out.append("<li>" + inline(re.sub(r"^\s*[-*] ", "", ln)) + "</li>")
        else:
            if in_ul:
                out.append("</ul>"); in_ul = False
            if ln.strip():
                out.append("<p>" + inline(ln) + "</p>")
    if in_ul:
        out.append("</ul>")
    return "\n".join(out)


def section(name):
    m = re.search(r"^## " + re.escape(name) + r"\n(.*?)(?=^## |\Z)", report, re.S | re.M)
    return m.group(1).strip() if m else ""


def rows(tbl):
    res = []
    for ln in tbl.splitlines():
        if ln.startswith("|") and not re.match(r"^\|\s*-", ln):
            res.append([c.strip() for c in ln.strip().strip("|").split(" | ")])
    return res[1:]  # drop header


# details
details = {}
for m in re.finditer(r"^### (N-\d{3})\n(.*?)(?=^### |^## |\Z)", detail, re.S | re.M):
    body = m.group(2).strip().splitlines()
    # drop first summary line (duplicates the table)
    if body and body[0].startswith("**"):
        body = body[1:]
    body = [b for b in body if not b.startswith("- Doporučení:")]
    details[m.group(1)] = md_block(body)

vyrazeno = ""
m = re.search(r"^## Vyřazeno\n(.*)", detail, re.S | re.M)
if m:
    vyrazeno = md_block(m.group(1).strip().splitlines())

head = report.split("## Ke schválení")[0].strip().splitlines()

main = []
for r in rows(section("Ke schválení jedním kliknutím")):
    idf, co, dop, pot = r[0], r[1], r[2], r[3]
    parts = [p.strip() for p in idf.split("·")]
    nid, pr, kat = parts[0], parts[1], parts[2]
    main.append(dict(id=nid, p=pr, k=kat, co=co, dop=dop, pot=pot))

KAT = {"K1": "zodpovězená otázka", "K2": "nezapsané rozhodnutí", "K3": "rozhodnutí vývojáře", "K4": "dokumentace × kód",
       "K5": "visí na PM", "K6": "starý stav", "K7": "byznysový dopad", "K8": "nová otázka"}

trs = []
for f in main:
    d = details.get(f["id"], "")
    det = f'<details><summary>Detail</summary><div class="det">{d}</div></details>' if d else ""
    trs.append(f'''<tr data-id="{f['id']}" data-p="{f['p']}" data-pot="{html.escape(f['pot'])}">
<td class="id"><a id="{f['id']}"></a><b>{f['id']}</b><span class="pill {f['p']}">{f['p']}</span><span class="kat" title="{KAT.get(f['k'],'')}">{f['k']}</span></td>
<td class="co">{inline(f['co'])}{det}</td>
<td class="dop">{inline(f['dop'])}</td>
<td class="pot">{html.escape(f['pot'])}</td>
<td class="vote"><div class="seg" role="group" aria-label="Rozhodnutí {f['id']}"><button type="button" class="yes on" aria-pressed="true">Ano</button><button type="button" class="no" aria-pressed="false">Změnit</button></div>
<textarea id="n-{f['id']}" rows="2" placeholder="Co jinak?" hidden></textarea></td></tr>''')


def link_ids(s):
    return re.sub(r"\b(N-\d{3})\b", r'<a href="#\1">\1</a>', s)


need = []
for ln in section("Opravdu potřebuje tvé rozhodnutí").splitlines():
    if ln.startswith("- "):
        need.append("<li>" + link_ids(inline(ln[2:])) + "</li>")

po = "".join(f"<tr><td class='id'>{link_ids(r[0])}</td><td>{inline(r[1])}</td><td>{inline(r[2])}</td></tr>" for r in rows(section("Pro klienta/PO")))
tl = "".join(f"<tr><td class='id'>{link_ids(inline(r[0]))}</td><td>{inline(r[1])}</td><td>{inline(r[2])}</td></tr>" for r in rows(section("Pro tech-leada / design")))
kat = "".join(f"<tr><td class='id'><b>{r[0]}</b></td><td>{inline(r[1])}</td><td class='num'>{r[2]}</td><td class='num'>{r[3]}</td><td class='num'>{r[4]}</td><td class='ids'>{link_ids(r[5])}</td></tr>" for r in rows(section("Podle kategorie")))

pots = sorted({f["pot"] for f in main})
pot_opts = "".join(f'<option value="{html.escape(p)}">{html.escape(p)}</option>' for p in pots)
cnt = {p: sum(1 for f in main if f["p"] == p) for p in ("P1", "P2", "P3")}

page = f'''<title>{TITLE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Layout: one working column — summary, one approval table, then lists for PO and tech lead. */
:root {{
  --bg: #f6f7f5; --surface: #ffffff; --fg: #1d2420; --muted: #5d6862; --line: #dde2de;
  --accent: #0f6b5c; --accent-soft: #e1efeb;
  --p1: #b3261e; --p1-soft: #fbe7e5; --p2: #8a5a00; --p2-soft: #fbf0d9; --p3: #4c5a53; --p3-soft: #eaeeeb;
  --change: #8a3b9e; --change-soft: #f3e6f6;
  --font: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --head: "Space Grotesk", "Inter", system-ui, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg: #121614; --surface: #1a201d; --fg: #e4ebe7; --muted: #9aa8a1; --line: #2c3531;
  --accent: #5cc4ae; --accent-soft: #183630;
  --p1: #ff8a80; --p1-soft: #3b1d1b; --p2: #f0c060; --p2-soft: #3a2e12; --p3: #b5c2bb; --p3-soft: #262e2a;
  --change: #d9a2ea; --change-soft: #35223b; color-scheme: dark; }} }}
:root[data-theme="dark"] {{
  --bg: #121614; --surface: #1a201d; --fg: #e4ebe7; --muted: #9aa8a1; --line: #2c3531;
  --accent: #5cc4ae; --accent-soft: #183630;
  --p1: #ff8a80; --p1-soft: #3b1d1b; --p2: #f0c060; --p2-soft: #3a2e12; --p3: #b5c2bb; --p3-soft: #262e2a;
  --change: #d9a2ea; --change-soft: #35223b; color-scheme: dark; }}
body {{ background: var(--bg); color: var(--fg); font: 14px/1.5 var(--font); }}
.wrap {{ max-width: 1240px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 28px; }}
h1, h2 {{ font-family: var(--head); text-wrap: balance; margin: 0; }}
h1 {{ font-size: 1.75rem; letter-spacing: -0.01em; }}
h2 {{ font-size: 1.2rem; }}
.meta {{ color: var(--muted); display: grid; gap: 2px; font-variant-numeric: tabular-nums; }}
section {{ display: grid; gap: 12px; min-width: 0; }}
a {{ color: var(--accent); }}
code {{ font: 0.9em ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--accent-soft); padding: 0 4px; border-radius: 3px; overflow-wrap: anywhere; }}
.bar {{ display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--bg); padding-block: 10px; border-bottom: 1px solid var(--line); }}
body::before {{ content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--bg); }}
.chips {{ display: flex; gap: 6px; flex-wrap: wrap; }}
.chip, .btn, select {{ font: inherit; border: 1px solid var(--line); background: var(--surface); color: var(--fg); border-radius: 999px; padding: 4px 12px; cursor: pointer; }}
.chip[aria-pressed="true"] {{ background: var(--accent); border-color: var(--accent); color: var(--surface); }}
.btn.primary {{ background: var(--accent); color: var(--surface); border-color: var(--accent); font-weight: 600; }}
.status {{ color: var(--muted); font-variant-numeric: tabular-nums; }}
.status b {{ color: var(--change); }}
.tbl {{ overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid var(--line); }}
th {{ font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight: 600; background: var(--surface); }}
tr:last-child td {{ border-bottom: 0; }}
#main td.co, #main td.dop {{ min-width: 220px; }}
td.id {{ white-space: nowrap; font-variant-numeric: tabular-nums; }}
td.id b {{ display: block; }}
.pill, .kat {{ display: inline-block; font-size: 0.72rem; font-weight: 600; border-radius: 4px; padding: 0 6px; margin-right: 4px; margin-top: 2px; }}
.pill.P1 {{ color: var(--p1); background: var(--p1-soft); }}
.pill.P2 {{ color: var(--p2); background: var(--p2-soft); }}
.pill.P3 {{ color: var(--p3); background: var(--p3-soft); }}
.kat {{ color: var(--muted); border: 1px solid var(--line); }}
td.pot {{ white-space: nowrap; color: var(--muted); }}
tr.p1row td.id {{ box-shadow: inset 3px 0 0 var(--p1); }}
tr.changed {{ background: var(--change-soft); }}
.seg {{ display: inline-flex; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }}
.seg button {{ font: inherit; border: 0; background: transparent; color: var(--muted); padding: 4px 10px; cursor: pointer; }}
.seg .yes.on {{ background: var(--accent); color: var(--surface); }}
.seg .no.on {{ background: var(--change); color: var(--surface); }}
td.vote {{ min-width: 150px; }}
textarea {{ display: block; width: 100%; margin-top: 6px; font: inherit; border: 1px solid var(--change); border-radius: 6px; padding: 4px 6px; background: var(--surface); color: var(--fg); box-sizing: border-box; }}
details summary {{ cursor: pointer; color: var(--accent); font-size: 0.85rem; margin-top: 6px; }}
.det {{ font-size: 0.88rem; color: var(--muted); max-width: 70ch; }}
.det ul {{ padding-left: 18px; margin: 6px 0; }}
.det p {{ margin: 6px 0; }}
ul.need {{ margin: 0; padding-left: 20px; display: grid; gap: 8px; max-width: 90ch; }}
td.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
td.ids {{ font-size: 0.85rem; }}
button:focus-visible, a:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 2px; }}
#copied {{ color: var(--accent); }}
#fallback {{ width: 100%; }}
@media (max-width: 640px) {{ h1 {{ font-size: 1.4rem; }} }}
</style>
<div class="wrap">
<header style="display:grid;gap:8px">
  <h1>{TITLE}</h1>
  <div class="meta">{"".join(f"<span>{inline(h)}</span>" for h in head)}</div>
  <p style="margin:0;max-width:75ch">Výchozí je <strong>Ano</strong> u všeho. Přepni na <strong>Změnit</strong> jen výjimky, napiš co jinak a tlačítkem zkopíruj výjimky do chatu.</p>
</header>

<section aria-labelledby="h-main">
  <h2 id="h-main">Ke schválení jedním kliknutím</h2>
  <div class="bar">
    <div class="chips" role="group" aria-label="Priorita">
      <button type="button" class="chip" data-p="all" aria-pressed="true">Vše {len(main)}</button>
      <button type="button" class="chip" data-p="P1" aria-pressed="false">P1 {cnt['P1']}</button>
      <button type="button" class="chip" data-p="P2" aria-pressed="false">P2 {cnt['P2']}</button>
      <button type="button" class="chip" data-p="P3" aria-pressed="false">P3 {cnt['P3']}</button>
    </div>
    <label>Potvrdí <select id="pot"><option value="all">kdokoli</option>{pot_opts}</select></label>
    <span class="status" id="status"></span>
    <button type="button" class="btn primary" id="copy">Zkopírovat výjimky</button>
    <span id="copied" aria-live="polite"></span>
  </div>
  <textarea id="fallback" rows="4" hidden readonly></textarea>
  <div class="tbl"><table id="main">
    <thead><tr><th>ID</th><th>Co</th><th>Doporučení</th><th>Potvrdí</th><th>Ano / Změnit</th></tr></thead>
    <tbody>{"".join(trs)}</tbody>
  </table></div>
</section>

<section aria-labelledby="h-need">
  <h2 id="h-need">Opravdu potřebuje tvé rozhodnutí</h2>
  <ul class="need">{"".join(need)}</ul>
</section>

<section aria-labelledby="h-po">
  <h2 id="h-po">Pro klienta / PO</h2>
  <div class="tbl"><table><thead><tr><th>ID</th><th>Věta k odeslání</th><th>Doporučená odpověď</th></tr></thead><tbody>{po}</tbody></table></div>
</section>

<section aria-labelledby="h-tl">
  <h2 id="h-tl">Pro tech-leada / design</h2>
  <div class="tbl"><table><thead><tr><th>ID</th><th>Co</th><th>Doporučení</th></tr></thead><tbody>{tl}</tbody></table></div>
</section>

<section aria-labelledby="h-kat">
  <h2 id="h-kat">Podle kategorie</h2>
  <div class="tbl"><table><thead><tr><th>Kat.</th><th>Význam</th><th>P1</th><th>P2</th><th>P3</th><th>ID</th></tr></thead><tbody>{kat}</tbody></table></div>
</section>

<section aria-labelledby="h-vyr">
  <details><summary><h2 id="h-vyr" style="display:inline">Vyřazené surové nálezy</h2></summary><div class="det">{vyrazeno}</div></details>
</section>
</div>
<script>
(function () {{
  var KEY = "{KEY}";
  var state = {{}};
  try {{ state = JSON.parse(localStorage.getItem(KEY) || "{{}}") || {{}}; }} catch (e) {{ state = {{}}; }}
  function save() {{ try {{ localStorage.setItem(KEY, JSON.stringify(state)); }} catch (e) {{}} }}
  var rows = Array.prototype.slice.call(document.querySelectorAll("#main tbody tr"));
  function apply(tr) {{
    var id = tr.dataset.id, s = state[id] || {{}}, ch = !!s.change;
    var yes = tr.querySelector(".yes"), no = tr.querySelector(".no"), ta = tr.querySelector("textarea");
    yes.classList.toggle("on", !ch); no.classList.toggle("on", ch);
    yes.setAttribute("aria-pressed", String(!ch)); no.setAttribute("aria-pressed", String(ch));
    ta.hidden = !ch; if (s.note && ta.value !== s.note) ta.value = s.note;
    tr.classList.toggle("changed", ch);
  }}
  function status() {{
    var n = rows.filter(function (r) {{ return (state[r.dataset.id] || {{}}).change; }}).length;
    document.getElementById("status").innerHTML = "Schváleno " + (rows.length - n) + " · <b>Změnit " + n + "</b>";
  }}
  rows.forEach(function (tr) {{
    if (tr.dataset.p === "P1") tr.classList.add("p1row");
    var id = tr.dataset.id;
    tr.querySelector(".yes").addEventListener("click", function () {{ state[id] = Object.assign(state[id] || {{}}, {{ change: false }}); save(); apply(tr); status(); }});
    tr.querySelector(".no").addEventListener("click", function () {{ state[id] = Object.assign(state[id] || {{}}, {{ change: true }}); save(); apply(tr); status(); tr.querySelector("textarea").focus(); }});
    tr.querySelector("textarea").addEventListener("input", function (e) {{ state[id] = Object.assign(state[id] || {{}}, {{ note: e.target.value }}); save(); }});
    apply(tr);
  }});
  status();
  var fp = "all", fpot = "all";
  function filter() {{ rows.forEach(function (tr) {{ tr.hidden = !((fp === "all" || tr.dataset.p === fp) && (fpot === "all" || tr.dataset.pot === fpot)); }}); }}
  document.querySelectorAll(".chip").forEach(function (b) {{
    b.addEventListener("click", function () {{
      fp = b.dataset.p;
      document.querySelectorAll(".chip").forEach(function (x) {{ x.setAttribute("aria-pressed", String(x === b)); }});
      filter();
    }});
  }});
  document.getElementById("pot").addEventListener("change", function (e) {{ fpot = e.target.value; filter(); }});
  document.getElementById("copy").addEventListener("click", function () {{
    var ex = rows.filter(function (r) {{ return (state[r.dataset.id] || {{}}).change; }});
    var txt = ex.length
      ? "Schvaluji všechna doporučení kromě:\\n" + ex.map(function (r) {{ var n = (state[r.dataset.id].note || "").trim(); return "- " + r.dataset.id + (n ? ": " + n : ": změnit (bez poznámky)"); }}).join("\\n")
      : "Schvaluji všechna doporučení (" + rows.length + "), bez výjimek.";
    var out = document.getElementById("copied"), fb = document.getElementById("fallback");
    function fallback() {{ fb.hidden = false; fb.value = txt; fb.select(); out.textContent = "Text je vybraný, zkopírujte ho."; }}
    try {{
      navigator.clipboard.writeText(txt).then(function () {{ out.textContent = "Zkopírováno (" + ex.length + " výjimek)"; fb.hidden = true; }}, fallback);
    }} catch (e) {{ fallback(); }}
  }});
}})();
</script>
'''
(OUT / "REPORT.html").write_text(page)
print("rows", len(main), "details", len(details), "bytes", len(page))
