import { expect, test } from "@playwright/test"
import { MANUAL_EVENT_LINK, ORGANIZER } from "./support/accounts"
import { signIn } from "./support/auth"

// US-103: in the manual mode a submitted application waits for the organizer in the queue "To evaluate".
test.describe("Queue to evaluate", () => {
  test("applicant submits in the manual mode, organizer sees the application in the queue", async ({
    page,
  }) => {
    // Unique per run, so the queue holds exactly this application whatever ran before.
    const unique = `${Date.now()}`
    await page.goto(MANUAL_EVENT_LINK)
    await page.getByLabel("First name").fill("Lenka")
    await page.getByLabel("Last name").fill(`Fronta ${unique}`)
    await page.getByLabel("Date of birth").fill("03/09/2013")
    await page.getByLabel("Gender").click()
    await page.getByRole("option", { name: "Woman", exact: true }).click()
    await page
      .getByRole("group", { name: /Choose terms/ })
      .getByRole("checkbox")
      .first()
      .check()
    await page.getByLabel("Contact e-mail").fill(`fronta-${unique}@example.com`)
    await page.getByLabel(/I agree to the processing/).check()
    await page.getByRole("button", { name: "Submit application" }).click()
    await expect(page).toHaveURL(/\/apply\/confirmation\//)

    await signIn(page, "organizer", ORGANIZER)
    await page.getByRole("link", { name: /Ruční vyhodnocení 2028/ }).click()
    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Applications" })
      .click()
    await page.getByRole("button", { name: "To evaluate" }).click()

    const row = page.getByRole("link", { name: new RegExp(`Lenka Fronta ${unique}`) })
    await expect(row).toBeVisible()
    await expect(row).toContainText("To evaluate")
    await expect(row).toContainText(`fronta-${unique}@example.com`)
  })
})
