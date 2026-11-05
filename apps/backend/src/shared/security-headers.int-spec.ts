// #293: every API response carries the security headers from helmet and
// doesn't say it runs on Express.
import { api } from "@/test/integration/test-api"

describe("security headers (integration)", () => {
  it("are on an API response, also an error one", async () => {
    const response = await fetch(api("/me"))

    expect(response.status).toBe(401)
    expect(response.headers.get("strict-transport-security")).toMatch(/max-age=\d+/)
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN")
    expect(response.headers.get("referrer-policy")).toBe("no-referrer")
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'self'")
    expect(response.headers.get("x-powered-by")).toBeNull()
  })

  it("let the frontend on another port of the same site show an API image", async () => {
    const response = await fetch(api("/me"))

    expect(response.headers.get("cross-origin-resource-policy")).toBe("same-site")
  })

  it("keep Swagger loading: its scripts are files, which the CSP allows", async () => {
    const page = await fetch(api("/docs"))
    const html = await page.text()

    expect(page.status).toBe(200)
    expect(page.headers.get("content-security-policy")).toContain("script-src 'self'")
    expect(html).not.toMatch(/<script>(?!\s*<\/script>)/)
    expect(html).toContain("swagger-ui-init.js")
  })
})
