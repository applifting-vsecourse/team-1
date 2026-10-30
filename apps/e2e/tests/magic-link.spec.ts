import { expect, test } from "@playwright/test"
import { PARTICIPANT } from "./support/accounts"
import { latestMagicLinkToken } from "./support/magic-link"
import { latestEmailSubject } from "./support/mail"

// US-01: the participant asks for a link, opens it from the e-mail and is signed in. Phone-first.
test.describe("Magic link", { tag: "@mobile" }, () => {
  test("participant requests a link, opens it and gets to the application", async ({ page }) => {
    await page.goto("/participant/magic-link")
    await page.getByLabel("E-mail").fill(PARTICIPANT.email)
    await page.getByRole("button", { name: "Send me a link" }).click()
    await expect(page.getByRole("status")).toContainText("Check your e-mail")

    const token = await latestMagicLinkToken()
    await page.goto(`/participant/magic-link?token=${token}`)
    await page.getByRole("button", { name: "Continue" }).click()

    // The seeded participant already has a password, so no password step follows.
    await expect(page.getByRole("heading", { level: 1, name: "Your applications" })).toBeVisible()
  })

  test("the e-mail is in English when asked for from the English UI", async ({ page }) => {
    await page.goto("/participant/magic-link")
    await page.getByLabel("E-mail").fill(PARTICIPANT.email)
    await page.getByRole("button", { name: "Send me a link" }).click()
    await expect(page.getByRole("status")).toContainText("Check your e-mail")

    await expect.poll(() => latestEmailSubject(PARTICIPANT.email)).toBe("Your Togena sign-in link")
  })
})

// The language of the e-mail is the UI language at the moment of the request,
// not the one stored on the account (the seeded participant has `en`).
test.describe("Magic link in Czech", { tag: "@mobile" }, () => {
  test.use({ locale: "cs-CZ" })

  test("the e-mail is in Czech when asked for from the Czech UI", async ({ page }) => {
    await page.goto("/participant/magic-link")
    await page.getByLabel("E-mail").fill(PARTICIPANT.email)
    await page.getByRole("button", { name: "Poslat odkaz" }).click()

    await expect
      .poll(() => latestEmailSubject(PARTICIPANT.email))
      .toBe("Váš přihlašovací odkaz do Togeny")
  })
})
