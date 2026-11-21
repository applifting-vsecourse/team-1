import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync, mkdtempSync, existsSync, unlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { createHash } from "node:crypto"
const source="import { expect, test } from \"@playwright/test\"\nimport pg from \"pg\"\nimport { e2eDatabaseUrl } from \"../scripts/database-url.mjs\"\nimport { ORGANIZER, SUMMER_CAMP_LINK } from \"./support/accounts\"\nimport { signIn, openEventList } from \"./support/auth\"\nimport { join } from \"node:path\"\n\ntest(\"capture organizer meals\", async ({ page }, info) => {\n  const db = new pg.Client({connectionString: e2eDatabaseUrl()})\n  await db.connect()\n  let eventId: string\n  try {\n    const result=await db.query('SELECT id FROM event WHERE \"publicToken\" = $1', [SUMMER_CAMP_LINK.split(\"/\").at(-1)])\n    eventId=result.rows[0].id\n  } finally { await db.end() }\n  const shot = async (state: string) => {\n    await page.waitForLoadState(\"networkidle\")\n    await page.evaluate(() => document.fonts.ready)\n    await page.screenshot({path:join(process.env.SHOTS_DIR!,state+\"-\"+info.project.name+\".png\"),fullPage:true,animations:\"disabled\"})\n  }\n  await signIn(page,\"organizer\",ORGANIZER)\n  await openEventList(page)\n  await page.evaluate(()=>localStorage.setItem(\"togena.language\",\"cs\"))\n  await page.goto(\"/organizer/events/\"+eventId+\"/meals\")\n  const view=page.locator(\"#kitchen-view\")\n  await expect(view).toBeVisible()\n  if(process.env.CAPTURE_PHASE===\"before\"){\n    await shot(\"before\")\n    return\n  }\n  // Exercise the existing organizer option setup in the disposable E2E database.\n  const apiBase=\"http://localhost:\"+ (process.env.E2E_BACKEND_PORT ?? \"4190\") + \"/api/organizer/events/\"+eventId+\"/meals\"\n  const options=await page.request.get(apiBase+\"/options\")\n  expect(options.ok()).toBeTruthy()\n  if (!(await options.json()).length) {\n    const save=await page.request.put(apiBase+\"/options\",{data:{options:[{name:\"Vegetariánská\"},{name:\"Bezlepková\"}]}})\n    expect(save.ok()).toBeTruthy()\n    await page.reload()\n    await expect(view).toBeVisible()\n  }\n  const terms=await (await page.request.get(apiBase+\"/summary\")).json()\n  let chosen:any, roster:any[]\n  for(const term of terms){\n    if(!term.total) continue\n    const response=await page.request.get(apiBase+\"/terms/\"+term.termId+\"/participants\")\n    expect(response.ok()).toBeTruthy()\n    const records=await response.json()\n    if(records.some((p:any)=>p.editable)){chosen=term;roster=records;break}\n  }\n  expect(chosen).toBeTruthy()\n  const index=terms.findIndex((t:any)=>t.termId===chosen.termId)\n  if(index>0){await page.locator(\"#meal-term\").click();await page.getByRole(\"option\").nth(index).click()}\n  await view.click()\n  await page.getByRole(\"option\",{name:/Úprava stravování|Edit meal preferences/}).click()\n  const table=page.getByRole(\"table\",{name:/^(Účastníci|Participants)$/})\n  await expect(table).toBeVisible()\n  const person=roster!.find((p:any)=>p.editable && (p.selectedOptionIds.length || p.allergies)) ?? roster!.find((p:any)=>p.editable)\n  const personName=person.firstName+\" \"+person.lastName\n  const row=table.getByRole(\"row\").filter({has:page.getByRole(\"cell\",{name:personName,exact:true})}).first()\n  await expect(row.getByRole(\"button\")).toBeVisible()\n  await shot(\"roster\")\n  await row.getByRole(\"button\").click()\n  await expect(page.getByRole(\"dialog\")).toContainText(personName)\n  await shot(\"dialog\")\n  await page.goto(\"/organizer/events/\"+eventId+\"/applications/\"+person.applicationId)\n  const edit=page.getByRole(\"button\",{name:new RegExp(\"^(Upravit stravování|Edit meals for)\")})\n  await expect(edit).toBeVisible()\n  await edit.scrollIntoViewIfNeeded()\n  await shot(\"detail\")\n})"
const e2e=process.cwd()
const root=resolve(e2e,"../..")
const output=mkdtempSync(join(tmpdir(),"togena-677-"))
const config="import base from \"./playwright.config\"\nimport { defineConfig, devices } from \"@playwright/test\"\nexport default defineConfig({...base,retries:0,timeout:120000,reporter:\"list\",testMatch:/zz-screenshots\\.spec\\.ts/,projects:[{name:\"desktop\",use:{...devices[\"Desktop Chrome\"],viewport:{width:1280,height:800},deviceScaleFactor:1}},{name:\"mobile\",use:{...devices[\"Pixel 7\"],viewport:{width:360,height:800},deviceScaleFactor:1}}]})\n"
for(const [phase,sha] of [["before","5b6e466af22ca63ac11c8e8f7749644954599ee3"],["after","652e6e95121825d45a54e2c771e935ff17fe2154"]]){
  execFileSync("git",["fetch","--no-tags","--depth=1","origin",sha],{cwd:root,stdio:"inherit"})
  execFileSync("git",["switch","--detach",sha],{cwd:root,stdio:"inherit"})
  const spec=join(e2e,"tests/zz-screenshots.spec.ts"), conf=join(e2e,"capture-677.config.ts")
  writeFileSync(spec,source);writeFileSync(conf,config)
  try {
    execFileSync("pnpm",["exec","playwright","test","--config","capture-677.config.ts"],{cwd:e2e,stdio:"inherit",env:{...process.env,SHOTS_DIR:output,CAPTURE_PHASE:phase}})
  } finally {
    unlinkSync(spec);unlinkSync(conf)
    for(const state of phase==="before"?["before"]:["roster","dialog","detail"]){
      for(const view of ["desktop","mobile"]){
        const name=state+"-"+view, path=join(output,name+".png")
        if (!existsSync(path))continue
        const bytes=readFileSync(path), b64=bytes.toString("base64")
        const emit=line=>new Promise((yes,no)=>process.stdout.write(line+"\n",err=>err?no(err):yes()))
        await emit(["SHOT677",name,bytes.length,createHash("sha256").update(bytes).digest("hex")].join(" "))
        for(let i=0;i<b64.length;i+=4096)await emit(["PNG677",name,i,b64.slice(i,i+4096)].join(" "))
      }
    }
  }
}
