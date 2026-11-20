import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { openEventList, signIn } from "./support/auth"
import { addRoom, chooseEvaluationMode, createEventWithTerm } from "./support/event-setup"

const sections = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Event sections" })

// US-101, D-083: the evaluation mode can be changed until the event receives its first application.
// Opening the applications does not lock it.
test.describe("Evaluation mode", () => {
  test("organizer chooses manual evaluation in the checklist before applications open", async ({
    page,
  }) => {
    await createEventWithTerm(page, `E2E režim ${Date.now()}`)
    await addRoom(page)
    await sections(page).getByRole("link", { name: "Overview" }).click()

    // Nothing is preselected and the step is not done until the organizer confirms a mode.
    await expect(page.getByRole("radio", { name: "Automatic" })).not.toBeChecked()
    await expect(page.getByRole("radio", { name: "Manual" })).not.toBeChecked()
    await expect(page.getByRole("button", { name: "Confirm evaluation mode" })).toBeDisabled()

    await chooseEvaluationMode(page, "Manual")
    // All steps are done: the link is open and the overview shows the chosen mode.
    await expect(page.getByText("Evaluation mode:")).toBeVisible()
    await expect(page.getByText("Manual", { exact: true })).toBeVisible()
  })

  test("the mode stays changeable while applications are open and locks with the first application", async ({
    page,
  }) => {
    const unique = `${Date.now()}`
    await createEventWithTerm(page, `E2E zámek ${unique}`)
    await addRoom(page)
    await chooseEvaluationMode(page, "Automatic")

    // Applications are open (the link works), yet no application has arrived.
    await sections(page).getByRole("link", { name: "Overview" }).click()
    const applyLink =
      (await page.getByRole("link", { name: "Open page" }).getAttribute("href")) ?? ""
    await sections(page).getByRole("link", { name: "Settings" }).click()
    await expect(page.getByRole("radio", { name: "Automatic" })).toBeChecked()
    await page.getByRole("radio", { name: "Manual" }).click()
    await page.getByRole("button", { name: "Save mode" }).click()
    await expect(page.getByText("Evaluation mode saved.")).toBeVisible()

    // The first application arrives.
    await page.goto(new URL(applyLink).pathname)
    await page.getByLabel("First name").fill("Zuzana")
    await page.getByLabel("Last name").fill(`Zámek ${unique}`)
    await page.getByLabel("Date of birth").fill("21/06/2012")
    await page.getByLabel("Gender").click()
    await page.getByRole("option", { name: "Woman", exact: true }).click()
    await page
      .getByRole("group", { name: /Choose at least one term/ })
      .getByRole("checkbox")
      .first()
      .check()
    await page.getByLabel("Contact e-mail").fill(`zamek-${unique}@example.com`)
    await page.getByLabel(/I agree to the processing/).check()
    await page.getByRole("button", { name: "Continue to review" }).click()
    await page.getByRole("button", { name: "Submit application" }).click()
    await expect(page).toHaveURL(/\/apply\/confirmation\//)

    await page.goto("/organizer/events")
    await page.getByRole("link", { name: new RegExp(`E2E zámek ${unique}`) }).click()
    await sections(page).getByRole("link", { name: "Settings" }).click()
    await expect(page.getByRole("radio", { name: "Manual" })).toBeChecked()
    await expect(page.getByText("Locked", { exact: true })).toBeVisible()
    await expect(
      page.getByText("The event already has an application, so the mode can no longer be changed."),
    ).toBeVisible()
    await expect(page.getByRole("radio", { name: "Manual" })).toBeDisabled()
  })

  test("an event with applications shows the mode locked with the reason", async ({ page }) => {
    await signIn(page, "organizer", ORGANIZER)
    await openEventList(page)
    await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()

    await sections(page).getByRole("link", { name: "Settings" }).click()
    await expect(page.getByRole("radio", { name: "Automatic" })).toBeChecked()
    await expect(page.getByText("Locked", { exact: true })).toBeVisible()
    await expect(
      page.getByText("The event already has an application, so the mode can no longer be changed."),
    ).toBeVisible()
    await expect(page.getByRole("radio", { name: "Automatic" })).toBeDisabled()
    await expect(page.getByRole("radio", { name: "Manual" })).toBeDisabled()
  })
})
