import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { signIn } from "./support/auth"
import { createEventWithTerm } from "./support/event-setup"

const sections = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Event sections" })

// US-101: the evaluation mode is chosen before applications open and locked afterwards.
test.describe("Evaluation mode", () => {
  test("organizer chooses manual evaluation before applications open and sees it in the overview", async ({
    page,
  }) => {
    await createEventWithTerm(page, `E2E režim ${Date.now()}`)

    await sections(page).getByRole("link", { name: "Settings" }).click()
    await expect(page.getByRole("radio", { name: "Automatic" })).toBeChecked()
    await page.getByRole("radio", { name: "Manual" }).click()
    await page.getByRole("button", { name: "Save mode" }).click()

    await sections(page).getByRole("link", { name: "Overview" }).click()
    await expect(page.getByText("Evaluation mode:")).toBeVisible()
    await expect(page.getByText("Manual", { exact: true })).toBeVisible()
  })

  test("an event with open applications shows the mode locked with the reason", async ({
    page,
  }) => {
    await signIn(page, "organizer", ORGANIZER)
    await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()

    await sections(page).getByRole("link", { name: "Settings" }).click()
    await expect(page.getByText("Automatic · locked")).toBeVisible()
    await expect(
      page.getByText("Applications are open, so the mode can no longer be changed."),
    ).toBeVisible()
    await expect(page.getByRole("radio")).toHaveCount(0)
  })
})
