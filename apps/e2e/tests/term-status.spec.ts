import { expect, test } from "@playwright/test"
import { ORGANIZER, SUMMER_CAMP_LINK } from "./support/accounts"
import { signIn } from "./support/auth"

// US-28: the organizer cancels an application in a term by hand; the change lands in the log.
test.describe("Status of an application in a term", () => {
  test("organizer cancels an application in a term and the change is logged", async ({ page }) => {
    // Unique per run: the same name and birth date on the same term is a duplicate (US-23).
    const lastName = `Zrušený ${Date.now()}`
    await page.goto(SUMMER_CAMP_LINK)
    await page.getByLabel("First name").fill("Karel")
    await page.getByLabel("Last name").fill(lastName)
    await page.getByLabel("Date of birth").fill("2012-05-12")
    await page.getByLabel("Gender").click()
    await page.getByRole("option", { name: "Man", exact: true }).click()
    await page
      .getByRole("group", { name: /Choose terms/ })
      .getByRole("checkbox")
      .first()
      .check()
    await page.getByLabel("Contact e-mail").fill(`zruseni-${Date.now()}@example.com`)
    await page.getByLabel(/I agree to the processing/).check()
    await page.getByRole("button", { name: "Submit application" }).click()
    await expect(page).toHaveURL(/\/apply\/confirmation\//)

    await signIn(page, "organizer", ORGANIZER)
    await expect(page.getByRole("heading", { level: 1, name: "Event list" })).toBeVisible()
    await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()
    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Applications" })
      .click()
    await page.getByRole("searchbox", { name: "Search applications" }).fill(lastName)
    await page.getByRole("searchbox", { name: "Search applications" }).press("Enter")
    const detail = page.getByRole("link", { name: "Record payment" })
    await expect(detail).toHaveCount(1)
    await detail.click()

    await page.getByRole("button", { name: "Cancel in term" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Cancel in term" }).click()

    await expect(page.getByRole("dialog")).not.toBeVisible()
    await expect(page.getByText(/Confirmed → Cancelled/)).toBeVisible()
    await expect(page.getByRole("button", { name: "Cancel in term" })).not.toBeVisible()
  })
})
