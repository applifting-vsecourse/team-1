import { expect, test } from "@playwright/test"
import { signIn } from "./support/auth"
import { latestMagicLinkToken } from "./support/magic-link"
import { createParticipantWithoutPassword } from "./support/participants"

// US-01 + US-04: a new participant enters by the link, chooses a password and signs in with it later.
test(
  "new participant sets a password and signs in with it",
  { tag: "@mobile" },
  async ({ page }) => {
    const { email } = await createParticipantWithoutPassword()
    const password = `own-${Date.now()}`

    await page.goto("/participant/magic-link")
    await page.getByLabel("E-mail").fill(email)
    await page.getByRole("button", { name: "Send me a link" }).click()
    await expect(page.getByRole("status")).toContainText("Check your e-mail")
    await page.goto(`/participant/magic-link?token=${await latestMagicLinkToken()}`)
    await page.getByRole("button", { name: "Continue" }).click()

    await expect(
      page.getByRole("heading", { level: 1, name: "Set your own password" }),
    ).toBeVisible()
    await page.getByLabel("New password", { exact: true }).fill(password)
    await page.getByLabel("Repeat new password").fill(password)
    await page.getByRole("button", { name: "Set password and open application" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "My application" })).toBeVisible()

    await page.goto("/participant/account")
    await page.getByRole("main").getByRole("button", { name: "Sign out" }).click()
    await signIn(page, "participant", { email, password })
    await expect(page.getByRole("heading", { level: 1, name: "My application" })).toBeVisible()
  },
)
