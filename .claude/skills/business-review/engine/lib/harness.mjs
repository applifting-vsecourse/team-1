// App window + controls for scenarios: role switching, 360 px, EN, slowed steps.
import fs from "node:fs"
import path from "node:path"
import { chromium, FRONTEND_URL, OUT_DIR, SLOW } from "./env.mjs"
import { cookiesFor, sleep } from "./api.mjs"
import { cookieFor } from "./sessions.mjs"
import { sessionsOnce, participantCredentials } from "./seed.mjs"
import { ORGANIZER } from "./env.mjs"

export const MOBILE = { width: 360, height: 740 }

export class Harness {
  constructor({ browser, context, page, cdp, headless, onMessage }) {
    Object.assign(this, { browser, context, page, cdp, headless, onMessage })
    this.lang = "cs"
    this.userMobile = false
    this.mobile = false
    this.slow = headless ? 0 : SLOW
  }

  static async launch({ headless, bounds, onMessage }) {
    const args = bounds
      ? [
          `--window-position=${bounds.x},${bounds.y}`,
          `--window-size=${bounds.width},${bounds.height}`,
        ]
      : []
    const browser = await chromium.launch({ headless, args })
    const context = await browser.newContext({
      viewport: headless ? { width: 1132, height: 860 } : null,
      locale: "cs-CZ",
      timezoneId: "Europe/Prague",
      acceptDownloads: true,
    })
    await context.addInitScript(() => {
      try {
        if (!localStorage.getItem("togena.language")) localStorage.setItem("togena.language", "cs")
      } catch {
        /* no localStorage */
      }
    })
    const page = await context.newPage()
    page.setDefaultTimeout(7000)
    const cdp = headless ? null : await context.newCDPSession(page)
    const harness = new Harness({ browser, context, page, cdp, headless, onMessage })
    // A signed-in account has a stored language (seed: Czech) that the app uses. For the EN switch we rewrite it
    // only in the response to this browser; nothing changes in the database.
    await context.route(/\/api\/auth\/get-session/, async (route) => {
      try {
        const response = await route.fetch()
        const json = await response.json().catch(() => null)
        if (json?.user) json.user.locale = harness.lang
        await route.fulfill({ response, ...(json === null ? {} : { json }) })
      } catch {
        await route.continue().catch(() => {})
      }
    })
    return harness
  }

  log(text, kind = "info") {
    this.onMessage?.(text, kind)
  }

  /** Role: "visitor" | "organizer" | "participant" | { email, password } */
  async as(role) {
    await this.context.clearCookies()
    if (role === "visitor") return
    await sessionsOnce()
    const account =
      role === "organizer" ? ORGANIZER : role === "participant" ? participantCredentials() : role
    const cookie = await cookieFor(account, { verify: true })
    await this.context.addCookies(cookiesFor(cookie, FRONTEND_URL))
  }

  /** Opens a page (optionally as another role) and waits until it loads. */
  async go(role, url) {
    await this.as(role)
    await this.page.goto(url.startsWith("http") ? url : `${FRONTEND_URL}${url}`, {
      waitUntil: "domcontentloaded",
    })
    await this.settle()
    return this.page
  }

  async settle() {
    await this.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {})
  }

  /** Visible, slowed step. On failure the view ends with a message and you finish it by hand. */
  async act(name, fn) {
    await sleep(this.slow)
    this.log(name)
    try {
      await fn(this.page)
    } catch (error) {
      throw new Error(
        `Krok „${name}“ se nepovedl (${String(error.message).split("\n")[0].slice(0, 140)}). Udělej ho ručně.`,
      )
    }
    await this.settle()
  }

  async scrollTo(locator) {
    await locator
      .first()
      .evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }))
    await this.page.evaluate(() => window.scrollBy(0, -90))
  }

  async setMobile(on) {
    if (on === this.mobile) return
    this.mobile = on
    if (this.headless) await this.page.setViewportSize(on ? MOBILE : { width: 1132, height: 860 })
    else if (on)
      await this.cdp.send("Emulation.setDeviceMetricsOverride", {
        ...MOBILE,
        deviceScaleFactor: 0,
        mobile: false,
      })
    else await this.cdp.send("Emulation.clearDeviceMetricsOverride")
    await sleep(150)
  }

  async setLanguage(lang) {
    this.lang = lang
    if (this.page.url().startsWith("http"))
      await this.page
        .evaluate((l) => localStorage.setItem("togena.language", l), lang)
        .catch(() => {})
  }

  async horizontalScroll() {
    const r = await this.page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }))
    this.log(
      r.s > r.c
        ? `Stránka se posouvá vodorovně (obsah ${r.s} px, okno ${r.c} px).`
        : `Bez vodorovného posunu (${r.c} px).`,
      r.s > r.c ? "warn" : "info",
    )
  }

  /** Prints a page to PDF in a hidden browser (same print styles as window.print) and opens it in Preview. */
  async printToPdf(url, name) {
    await sessionsOnce()
    const cookie = await cookieFor(ORGANIZER, { verify: true })
    const browser = await chromium.launch({ headless: true })
    try {
      const context = await browser.newContext({
        locale: "cs-CZ",
        timezoneId: "Europe/Prague",
        viewport: { width: 1280, height: 900 },
      })
      await context.addCookies(cookiesFor(cookie, FRONTEND_URL))
      const lang = this.lang
      await context.addInitScript((l) => localStorage.setItem("togena.language", l), lang)
      const page = await context.newPage()
      await page.goto(`${FRONTEND_URL}${url}`, { waitUntil: "networkidle", timeout: 30000 })
      await sleep(1500)
      const target = path.join(OUT_DIR, `${name}.pdf`)
      const pdf = await page.pdf({ path: target, format: "A4", printBackground: true })
      const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length
      this.log(`PDF „${name}“: ${pages} stran → ${target}`)
      if (!this.headless) {
        const { spawn } = await import("node:child_process")
        spawn("open", [target], { stdio: "ignore", detached: true }).unref()
      }
      return { target, pages, size: fs.statSync(target).size }
    } finally {
      await browser.close()
    }
  }

  async close() {
    await this.browser.close().catch(() => {})
  }
}
