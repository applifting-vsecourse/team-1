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
    await applyForTerm(page, "Lenka", unique)
    if (isMobile) await applyForTerm(page, "Irena", unique)

    await signIn(page, "organizer", ORGANIZER)

    await openEventList(page)
    await page.getByRole("link", { name: /Ruční vyhodnocení 2028/ }).click()
    if (isMobile) {
      await evaluateOnPhone(page, unique)
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
    const details = row.getByRole("button", { name: `Lenka Fronta ${unique}` })
    await expect(details).toHaveAttribute("aria-expanded", "false")
    await details.press("Enter")
    await expect(row).toContainText(`lenka-fronta-${unique}@example.com`)
    await expect(page.getByRole("combobox", { name: "Term" })).toBeVisible()
    await row.getByRole("checkbox").check()
    await expect(page.getByRole("button", { name: "Move to waitlist" })).toBeEnabled()
  })
})

async function applyForTerm(page: Page, firstName: string, unique: string) {
  await page.goto(MANUAL_EVENT_LINK)
  await page.getByLabel("First name").fill(firstName)
  await page.getByLabel("Last name").fill(`Fronta ${unique}`)
  await page.getByLabel("Date of birth").fill("03/09/2013")
  await page.getByRole("combobox", { name: "Gender" }).click()
  await page.getByRole("option", { name: "Woman", exact: true }).click()
  await page
    .getByRole("group", { name: /Choose at least one term/ })
    .getByRole("checkbox")
    .first()
    .check()
  await page
    .getByLabel("Contact e-mail")
    .fill(`${firstName.toLowerCase()}-fronta-${unique}@example.com`)
  await page.getByLabel(/I agree to the processing/).check()
  await page.getByRole("button", { name: "Continue to review" }).click()
  await page.getByRole("button", { name: "Submit application" }).click()
  await expect(page).toHaveURL(/\/apply\/confirmation\//)
}

async function evaluateOnPhone(page: Page, unique: string) {
  const sections = page.getByRole("navigation", { name: "Event sections" })
  const sectionSheet = page.getByRole("dialog", { name: "Event sections" })
  await sections.getByRole("button", { name: "Overview" }).tap()
  await sectionSheet.getByRole("link", { name: "Applications" }).tap()
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
  const applicants = ["Lenka", "Irena"].map((firstName) => `${firstName} Fronta ${unique}`)
  const checkboxes = applicants.map((applicant) =>
    page.getByRole("checkbox", { name: `Select application: ${applicant}` }),
  )
  for (const checkbox of checkboxes) await checkbox.tap()
  await expect(page.getByRole("status").filter({ hasText: /^2 applications$/ })).toBeVisible()

  await chip.tap()
  await expect(chip).toHaveCount(0)
  for (const checkbox of checkboxes) await expect(checkbox).not.toBeChecked()
  await expect(page.getByRole("radio", { name: "Awaiting evaluation" })).toBeChecked()
  for (const checkbox of checkboxes) await checkbox.tap()
  await page.getByRole("button", { name: "Move to waitlist", exact: true }).tap()
  const confirmation = page.getByRole("dialog", { name: "Move selected to the waitlist" })
  for (const applicant of applicants) await expect(confirmation).toContainText(applicant)
  await confirmation.getByRole("button", { name: "Move to the waitlist" }).tap()
  await expect(page.getByText("2 applications moved to the waitlist")).toBeVisible()
  await sections.getByRole("button", { name: "Applications" }).tap()
  await sectionSheet.getByRole("link", { name: "Capacity" }).tap()
  await expect(sections.getByRole("button", { name: "Capacity" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Occupancy of all terms" })).toBeVisible()
}
