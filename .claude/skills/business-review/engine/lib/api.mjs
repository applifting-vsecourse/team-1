// Thin client of the app API (same requests as the UI). No database writes outside the API.
import { API, FRONTEND_URL } from "./env.mjs"

export class ApiError extends Error {
  constructor(method, path, status, body) {
    super(
      `${method} ${path} → ${status}: ${typeof body === "string" ? body : JSON.stringify(body)}`,
    )
    this.status = status
    this.body = body
  }
}

export async function req(method, path, { cookie, body, csv, ok } = {}) {
  const headers = { Origin: FRONTEND_URL }
  if (cookie) headers.Cookie = cookie
  let payload
  if (csv !== undefined) {
    headers["Content-Type"] = "text/csv"
    payload = csv
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${API}${path}`, { method, headers, body: payload })
  const text = await res.text()
  let data = text
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* text */
  }
  const accepted = ok ?? [200, 201, 204]
  if (!accepted.includes(res.status)) throw new ApiError(method, path, res.status, data)
  return { status: res.status, data, headers: res.headers }
}

/** Sign-in through BetterAuth; returns the Cookie header. */
export async function login({ email, password }) {
  const res = await fetch(`${API}/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: FRONTEND_URL },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Přihlášení ${email} selhalo (${res.status}): ${await res.text()}`)
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ")
}

/** Cookie header -> cookies for Playwright (context.addCookies). */
export function cookiesFor(cookieHeader, url) {
  const host = new URL(url).hostname
  return cookieHeader
    .split("; ")
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf("=")
      return { name: pair.slice(0, i), value: pair.slice(i + 1), domain: host, path: "/" }
    })
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
