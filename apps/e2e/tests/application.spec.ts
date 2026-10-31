import { expect, test } from "@playwright/test"
import { SUMMER_CAMP_LINK } from "./support/accounts"
import { latestMagicLinkToken } from "./support/magic-link"

// US-23 application from a link, US-40 price, US-25 / US-27 submit and status. Runs on a phone too (@mobile).
test.describe("Application from a link", { tag: "@mobile" }, () => {
  test("applicant sees the event and the price of the chosen terms", async ({ page }) => {
    await page.goto(SUMMER_CAMP_LINK)
    await expect(
      page.getByRole("region", { name: "Application for Letní kemp 2027" }),
    ).toBeVisible()

    const terms = page.getByRole("group", { name: /Choose terms/ }).getByRole("checkbox")
    const total = page.locator("p", { hasText: "Total" })

    await terms.nth(0).check()
    await expect(total).toContainText("4,500")

    await terms.nth(1).check()
    await expect(total).toContainText("9,400")
  })

  test("applicant submits, lands on the confirmation and sees the application after signing in", async ({
    page,
  }) => {
    // Unique per run: the same name and birth date on the same term is a duplicate (US-23),
    // and the desktop and mobile projects share one database.
    const unique = `${Date.now()}`
    const email = `prihlaska-${unique}@example.com`
    await page.goto(SUMMER_CAMP_LINK)

    await page.getByLabel("First name").fill("Karel")
    await page.getByLabel("Last name").fill(`Novotný ${unique}`)
    await page.getByLabel("Date of birth").fill("12/05/2012")
    await page.getByLabel("Gender").click()
    await page.getByRole("option", { name: "Man", exact: true }).click()
    await page
      .getByRole("group", { name: /Choose terms/ })
      .getByRole("checkbox")
      .first()
      .check()
    await page.getByLabel("Contact e-mail").fill(email)
    await page.getByLabel(/I agree to the processing/).check()
    await page.getByRole("button", { name: "Submit application" }).click()

    await expect(page).toHaveURL(/\/apply\/confirmation\//)
    await expect(
      page.getByRole("heading", { level: 1, name: "We've received your application" }),
    ).toBeVisible()
    // US-25: the term status and where to pay.
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "To pay for the confirmed terms" }),
    ).toBeVisible()
    await expect(page.getByText("2900123456/2010")).toBeVisible()

    // The applicant has no password yet: the e-mailed link leads to setting one, then to the application.
    await page.goto("/participant/magic-link")
    await page.getByLabel("E-mail").fill(email)
    await page.getByRole("button", { name: "Send me a link" }).click()
    await expect(page.getByRole("status")).toContainText("Check your e-mail")
    await page.goto(`/participant/magic-link?token=${await latestMagicLinkToken()}`)
    await page.getByRole("button", { name: "Continue" }).click()
    await page.getByLabel("New password", { exact: true }).fill("own-password-1")
    await page.getByLabel("Repeat new password").fill("own-password-1")
    await page.getByRole("button", { name: "Set password and open application" }).click()

    await expect(page.getByRole("heading", { level: 1, name: "Your applications" })).toBeVisible()
    await expect(page.getByText("Letní kemp 2027")).toBeVisible()
    await expect(page.getByText(/Confirmed|Waitlisted/).first()).toBeVisible()
  })
})
