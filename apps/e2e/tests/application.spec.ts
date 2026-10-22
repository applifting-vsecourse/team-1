import { expect, test } from "@playwright/test"
import { SUMMER_CAMP_LINK } from "./support/accounts"

// US-23 application from a link, US-40 price of the chosen terms. Runs on a phone too (@mobile).
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

  // US-27 saving, US-25 the page after sending: a confirmed term and where to pay.
  test("applicant submits and sees the confirmed term and what to pay", async ({ page }) => {
    await page.goto(SUMMER_CAMP_LINK)
    await page.getByLabel("First name *").fill("Eva")
    await page.getByLabel("Last name *").fill("Testová")
    await page.getByLabel("Date of birth *").fill("18. 5. 2010")
    await page.getByRole("combobox", { name: "Gender *" }).click()
    await page.getByRole("option", { name: "Woman" }).click()
    await page
      .getByRole("group", { name: /Choose terms/ })
      .getByRole("checkbox")
      .first()
      .check()
    await page.getByLabel("Contact e-mail *").fill(`eva-${Date.now()}@example.com`)
    await page.getByRole("checkbox", { name: /I agree to the processing/ }).check()
    await page.getByRole("button", { name: "Submit application" }).click()

    await expect(
      page.getByRole("heading", { name: "We've received your application" }),
    ).toBeVisible()
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "To pay for the confirmed terms" }),
    ).toBeVisible()
    await expect(page.getByText("2900123456/2010")).toBeVisible()
  })
})
