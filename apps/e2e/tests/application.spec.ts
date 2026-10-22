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

  // Next core journey — enable when US-27 / US-25 are merged (docs/E2E.md, „Co testujeme“).
  test.fixme("applicant submits and sees confirmed / waitlisted terms and what to pay", async () => {})
})
