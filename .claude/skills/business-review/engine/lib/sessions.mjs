// Cached sign-in: password sign-in is limited to 5 per minute per IP, so a valid session is reused.
import fs from "node:fs"
import path from "node:path"
import { API, FRONTEND_URL, STATE_DIR } from "./env.mjs"
import { sleep } from "./api.mjs"

const file = path.join(STATE_DIR, `sessions-${new URL(API).port || "default"}.json`)
let cache = {}
try {
  cache = JSON.parse(fs.readFileSync(file, "utf8"))
} catch {
  /* none yet */
}
const fresh = new Map() // email -> time of the last check
const pending = new Map()

async function isValid(cookie) {
  const res = await fetch(`${API}/auth/get-session`, {
    headers: { Cookie: cookie, Origin: FRONTEND_URL },
  })
  if (!res.ok) return false
  const body = await res.json().catch(() => null)
  return Boolean(body?.user)
}

async function signIn({ email, password }) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: FRONTEND_URL },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok)
      return res.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ")
    if (res.status === 429 && attempt < 4) {
      console.log("   limit přihlášení (429), čekám 20 s…")
      await sleep(20000)
      continue
    }
    throw new Error(`Přihlášení ${email} selhalo (${res.status}): ${await res.text()}`)
  }
}

/** Cookie header of a valid session. `verify` forces a check (after a manual sign-out in the browser). */
export async function cookieFor(account, { verify = false } = {}) {
  const key = account.email
  if (!verify && cache[key] && Date.now() - (fresh.get(key) ?? 0) < 60_000) return cache[key]
  if (!pending.has(key)) {
    pending.set(
      key,
      (async () => {
        if (!cache[key] || !(await isValid(cache[key]))) {
          cache[key] = await signIn(account)
          fs.writeFileSync(file, JSON.stringify(cache), { mode: 0o600 })
        }
        fresh.set(key, Date.now())
        return cache[key]
      })().finally(() => pending.delete(key)),
    )
  }
  return pending.get(key)
}
