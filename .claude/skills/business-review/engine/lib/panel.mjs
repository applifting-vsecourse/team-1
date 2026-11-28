// Control window on the left: current stories, what to test and view buttons. Everything is driven from here.
import { chromium } from "./env.mjs"

export const PANEL_WIDTH = 430

const HTML = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Business review · ovládání</title><style>
:root{--bg:#f6f7f5;--card:#fff;--line:#d8dcd6;--fg:#161a17;--muted:#5d665f;--accent:#c2500c;--soft:#fdeee2;--warn:#7a4f00;--warnbg:#fbefd2;--bad:#9d2020}
@media (prefers-color-scheme:dark){:root{--bg:#141715;--card:#1d211e;--line:#323833;--fg:#e8ece8;--muted:#9aa39c;--accent:#ff8a45;--soft:#38210f;--warn:#f0c264;--warnbg:#33280e;--bad:#ff9a9a}}
*{box-sizing:border-box}html,body{margin:0;height:100%}body{display:flex;flex-direction:column;background:var(--bg);color:var(--fg);font:14px/1.45 -apple-system,system-ui,sans-serif}
header,footer{padding:10px 12px;background:var(--card);border-color:var(--line);border-style:solid;border-width:0}
header{border-bottom-width:1px}footer{border-top-width:1px;display:grid;gap:8px}
main{flex:1;overflow:auto;padding:12px;display:grid;gap:12px;align-content:start}
select,button{font:inherit;color:inherit}select{width:100%;padding:6px;border-radius:6px;border:1px solid var(--line);background:var(--card)}
button{cursor:pointer;border:1px solid var(--line);background:var(--card);border-radius:7px;padding:7px 10px;text-align:left}
button:hover:not(:disabled){border-color:var(--accent)}button:disabled{opacity:.55;cursor:default}
button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
h1{font-size:17px;margin:0;line-height:1.3}.muted{color:var(--muted);font-size:12.5px}
.story{border-left:3px solid var(--accent);background:var(--card);padding:6px 10px;border-radius:0 6px 6px 0}.story b{font-variant-numeric:tabular-nums}
.note{background:var(--warnbg);color:var(--warn);border-radius:6px;padding:6px 8px;font-size:12.5px;margin-top:5px}
h2{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}
ul{margin:0;padding-left:18px;display:grid;gap:5px}
.views{display:grid;gap:5px}.views button.on{background:var(--soft);border-color:var(--accent);font-weight:600}.views button.seen:not(.on)::after{content:" ✓";color:var(--muted)}
#log{font-size:12.5px;display:grid;gap:3px}#log .warn{color:var(--warn)}#log .error{color:var(--bad);font-weight:600}
.row{display:flex;gap:8px}.row>button{flex:1;text-align:center}
#next{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600;flex:2}
.toggle[aria-pressed=true],.chips button[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.chips button{font-size:12.5px;padding:3px 8px}.chips button:nth-child(3){margin-left:auto}
textarea{width:100%;resize:vertical;font:inherit;color:inherit;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:6px 8px}
#error{color:var(--bad);font-weight:600}#error:empty{display:none}
</style></head><body>
<header><select id="jump" aria-label="Blok"></select><div class="muted" id="pos"></div></header>
<main><div><h1 id="title">Připravuji…</h1></div><div id="stories" style="display:grid;gap:6px"></div>
<section><h2>Zobrazení – klikněte na cokoli</h2><div class="views" id="views"></div></section>
<section><div id="log" aria-live="polite"></div></section>
<section><h2>Co zkontrolovat</h2><ul id="look"></ul></section>
<details><summary>Obecné poznámky</summary><textarea id="general" rows="4" aria-label="Obecné poznámky"></textarea></details></main>
<footer><textarea id="note" rows="4" aria-label="Poznámky k bloku" placeholder="Poznámky k bloku: bugy, úpravy, nápady"></textarea><div id="error" role="alert"></div>
<div class="row"><button class="toggle" id="mobile" aria-pressed="false" title="M">360 px</button><button class="toggle" id="lang" aria-pressed="false" title="E">English</button><button id="reload" title="R">↻ Znovu</button><button id="fresh">Čerstvá data</button></div>
<div class="row"><button id="prev" title="←">← Zpět</button><button id="next" title="→">Další →</button></div>
<div class="muted">Šipky ←/→ · M mobil · E angličtina · R znovu · Esc opustí poznámku. Vše se ukládá samo.</div></footer>
<script>
const $=(s)=>document.querySelector(s)
const send=(a,v)=>window.brAction(a,v)
function el(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e}
const CHOICES=[["verdict","done","Done"],["verdict","back","Vrátit"],["tag","bug","Bug"],["tag","change","Úprava"],["tag","idea","Nápad"]]
let blockId=null,generalLoaded=false
const edit=(e)=>window.brEdit(e).then(()=>{$("#error").textContent=""},()=>{$("#error").textContent="Uložení selhalo – poznámku si zkopírujte."})
$("#note").oninput=(e)=>edit({block:blockId,field:"note",value:e.target.value})
$("#general").oninput=(e)=>edit({field:"general",value:e.target.value})
window.render=(s)=>{
  const jump=$("#jump")
  if(jump.dataset.key!==s.menuKey){jump.dataset.key=s.menuKey;jump.replaceChildren(...s.menu.map(m=>{const o=el("option",m.label);o.value=m.index;return o}))}
  jump.value=s.block;$("#pos").textContent="Blok "+(s.block+1)+" z "+s.menu.length+" · posouzeno "+s.progress+" · "+s.scenario
  // Note controls are built only when the block changes, so a re-render keeps cursor and focus.
  if(blockId!==s.blockId){
    blockId=s.blockId;document.querySelector("main").scrollTop=0;$("#note").value=s.note
    $("#stories").replaceChildren(...s.stories.map(st=>{const d=el("div",null,"story");const t=el("div");t.append(el("b","#"+st.n+" "),document.createTextNode(st.title));d.append(t);if(st.note)d.append(el("div",st.note,"note"))
      const chips=el("div",null,"chips")
      for(const [field,value,label] of CHOICES){const b=el("button",label);b.dataset.story=st.n;b.dataset.field=field;b.dataset.value=value;b.setAttribute("aria-label",label+" #"+st.n);b.onclick=()=>edit({block:s.blockId,story:st.n,field,value});chips.append(b)}
      d.append(chips);return d}))
  }
  for(const b of document.querySelectorAll(".chips button")){const e=s.entries[b.dataset.story]
    b.setAttribute("aria-pressed",Boolean(e&&(b.dataset.field==="verdict"?e.verdict===b.dataset.value:e.tags.includes(b.dataset.value))))}
  if(!generalLoaded){generalLoaded=true;$("#general").value=s.general}
  $("#title").textContent=s.title
  $("#views").replaceChildren(...s.views.map((v,i)=>{const b=el("button",(i+1)+". "+v.label);if(i===s.view)b.classList.add("on");if(v.seen)b.classList.add("seen");b.disabled=s.busy;b.onclick=()=>send("view",i);return b}))
  $("#log").replaceChildren(...s.log.map(l=>el("div",l.text,l.kind)))
  $("#look").replaceChildren(...s.look.map(l=>el("li",l)))
  $("#mobile").setAttribute("aria-pressed",s.mobile);$("#lang").setAttribute("aria-pressed",s.lang==="en")
  for(const id of ["next","prev","mobile","lang","reload","fresh","jump"]) $("#"+id).disabled=s.busy
  $("#next").textContent=s.busy?"Pracuji…":s.nextLabel
}
$("#jump").onchange=(e)=>send("block",Number(e.target.value))
for(const id of ["next","prev","mobile","lang","reload","fresh"]) $("#"+id).onclick=()=>send(id)
document.addEventListener("keydown",(e)=>{if(e.key==="Escape")e.target.blur?.()
  if(e.metaKey||e.ctrlKey||e.altKey||["SELECT","TEXTAREA","INPUT"].includes(e.target.tagName))return
  const k={ArrowRight:"next",ArrowLeft:"prev",m:"mobile",e:"lang",r:"reload"}[e.key];if(k){e.preventDefault();send(k)}})
</script></body></html>`

export class Panel {
  static async launch({ headless, onAction, onEdit }) {
    const browser = await chromium.launch({
      headless,
      args: headless ? [] : ["--window-position=0,0", `--window-size=${PANEL_WIDTH},1000`],
    })
    const context = await browser.newContext({
      viewport: headless ? { width: PANEL_WIDTH, height: 900 } : null,
    })
    const page = await context.newPage()
    await page.exposeFunction("brAction", (action, value) => void onAction(action, value))
    await page.exposeFunction("brEdit", (edit) => onEdit(edit))
    await page.setContent(HTML)
    const panel = new Panel()
    Object.assign(panel, { browser, page })
    if (!headless) {
      // The panel takes the full height on the left, the app gets the rest of the screen.
      const screen = await page.evaluate(() => ({
        x: window.screen.availLeft ?? 0,
        y: window.screen.availTop ?? 0,
        width: window.screen.availWidth,
        height: window.screen.availHeight,
      }))
      const cdp = await context.newCDPSession(page)
      const { windowId } = await cdp.send("Browser.getWindowForTarget")
      await cdp.send("Browser.setWindowBounds", {
        windowId,
        bounds: { left: screen.x, top: screen.y, width: PANEL_WIDTH, height: screen.height },
      })
      panel.appBounds = {
        x: screen.x + PANEL_WIDTH,
        y: screen.y,
        width: Math.max(screen.width - PANEL_WIDTH, 1080),
        height: screen.height,
      }
    }
    return panel
  }

  async render(state) {
    await this.page.evaluate((s) => window.render(s), state).catch(() => {})
  }

  async close() {
    await this.browser.close().catch(() => {})
  }
}
