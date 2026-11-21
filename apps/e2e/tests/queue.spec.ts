import { expect, test, type Page } from "@playwright/test"
import { MANUAL_EVENT_LINK, ORGANIZER } from "./support/accounts"
import { openEventList, signIn } from "./support/auth"

// US-103: in the manual mode a submitted application waits for the organizer in the queue "Awaiting evaluation".
test.describe("Queue to evaluate", () => {
  test("applicant submits in the manual mode, organizer sees the application in the queue @mobile", async ({
    page,
    isMobile,
  }) => {
    if (isMobile) await page.setViewportSize({ width: 360, height: 800 })
    // Unique per run, so the queue holds exactly this application whatever ran before.
    const unique = `${Date.now()}`
    await page.goto(MANUAL_EVENT_LINK)
    await page.getByLabel("First name").fill("Lenka")
    await page.getByLabel("Last name").fill(`Fronta ${unique}`)
    await page.getByLabel("Date of birth").fill("03/09/2013")
    await page.getByLabel("Gender").click()
    await page.getByRole("option", { name: "Woman", exact: true }).click()
    await page
      .getByRole("group", { name: /Choose at least one term/ })
      .getByRole("checkbox")
      .first()
      .check()
    await page.getByLabel("Contact e-mail").fill(`fronta-${unique}@example.com`)
    await page.getByLabel(/I agree to the processing/).check()
    await page.getByRole("button", { name: "Continue to review" }).click()
    await page.getByRole("button", { name: "Submit application" }).click()
    await expect(page).toHaveURL(/\/apply\/confirmation\//)

    await signIn(page, "organizer", ORGANIZER)

    await openEventList(page)
    await page.getByRole("link", { name: /Ruční vyhodnocení 2028/ }).click()
    if (isMobile) {
      await evaluateOnPhone(page, `Lenka Fronta ${unique}`)
      return
    }

    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Applications" })
      .click()
    await page.getByRole("radio", { name: "Awaiting evaluation" }).click()

    const row = page.getByRole("row", { name: new RegExp(`Lenka Fronta ${unique}`) })
    await expect(row).toBeVisible()
    await expect(row).toContainText("Awaiting evaluation")
    await expect(row).toContainText(`fronta-${unique}@example.com`)
    await expect(page.getByRole("combobox", { name: "Term" })).toBeVisible()
    await row.getByRole("checkbox").check()
    await expect(page.getByRole("button", { name: "Move to waitlist" })).toBeEnabled()
  })
})

async function evaluateOnPhone(page: Page, name: string) {
  const sections = page.getByRole("navigation", { name: "Event sections" })
  await sections.getByRole("button", { name: "Overview" }).tap()
  await page.getByRole("menuitem", { name: "Applications" }).tap()
  await expect(sections.getByRole("button", { name: "Applications" })).toBeVisible()
  await page.getByRole("radio", { name: "Awaiting evaluation" }).tap()

  const filters = page.getByRole("button", { name: /^Filters/ })
  const sheet = page.getByRole("dialog", { name: "Filters" })
  await filters.tap()
  await expect(sheet.getByRole("combobox", { name: "Status" })).toBeDisabled()
  await sheet.getByRole("combobox", { name: "Term" }).tap()
  await page.getByRole("option", { name: /2028/ }).tap()
  await sheet.getByRole("button", { name: "Show applications" }).tap()
  const chip = page.getByRole("group", { name: "Active filters" }).getByRole("button")
  await expect(chip).toHaveAccessibleName(/Remove filter: .*2028/)
  const participant = page.getByRole("checkbox", { name: `Select application: ${name}` })
  await participant.tap()
  await expect(page.getByRole("status").filter({ hasText: /^1 application$/ })).toBeVisible()

  await chip.tap()
  await expect(chip).toHaveCount(0)
  await expect(participant).not.toBeChecked()
  await expect(page.getByRole("radio", { name: "Awaiting evaluation" })).toBeChecked()
  await participant.tap()
  await page.getByRole("button", { name: "Move to waitlist", exact: true }).tap()
  const confirmation = page.getByRole("dialog", { name: "Move selected to the waitlist" })
  await expect(confirmation.getByText(name)).toBeVisible()
  await confirmation.getByRole("button", { name: "Move to the waitlist" }).tap()
  await expect(page.getByText("1 application moved to the waitlist")).toBeVisible()
  await sections.getByRole("button", { name: "Applications" }).tap()
  await page.getByRole("menuitem", { name: "Capacity" }).tap()
  await expect(sections.getByRole("button", { name: "Capacity" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Occupancy of all terms" })).toBeVisible()
}
