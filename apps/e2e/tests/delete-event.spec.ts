import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { signIn } from "./support/auth"
import { createEventWithTerm } from "./support/event-setup"

// Issue #153: only an event nobody has applied to can be deleted, with its terms and rooms.
test.describe("Delete event", () => {
  test("organizer deletes an event without applications and it leaves the list", async ({
    page,
  }) => {
    const name = `E2E smazat ${Date.now()}`
    await createEventWithTerm(page, name)

    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Overview" })
      .click()
    await page.getByRole("button", { name: "Delete event" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Delete event" }).click()

    await expect(page.getByText(`Event ${name} has been deleted`)).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: "Event list" })).toBeVisible()
    await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0)
  })

  test("an event with applications cannot be deleted", async ({ page }) => {
    await signIn(page, "organizer", ORGANIZER)
    await expect(page.getByRole("heading", { level: 1, name: "Event list" })).toBeVisible()
    await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()

    await page.getByRole("button", { name: "Delete event" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Delete event" }).click()

    await expect(dialog.getByText("An event with applications cannot be deleted.")).toBeVisible()
    await dialog.getByRole("button", { name: "Keep" }).click()
    await expect(page.getByRole("heading", { name: "Event overview" })).toBeVisible()
  })
})
