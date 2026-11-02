import { expect, test } from "@playwright/test"
import { createEventWithTerm } from "./support/event-setup"

// US-12 event, US-13 terms, US-16 term price, US-99 rooms of a term. The application link works
// only once every term of the event has a price and a room.
test.describe("Event setup", () => {
  test("organizer creates an event, adds a term with a price and sees that a room is missing", async ({
    page,
  }) => {
    await createEventWithTerm(page, `E2E akce ${Date.now()}`)

    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Overview" })
      .click()
    await expect(page.getByText("The application link is not active yet")).toBeVisible()
    await expect(page.getByRole("button", { name: /Copy/ })).toHaveCount(0)
  })

  test("organizer adds a room to the term and copies the application link", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await createEventWithTerm(page, `E2E akce ${Date.now()}`)

    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Overview" })
      .click()
    await page.getByRole("link", { name: "Add a room" }).click()
    // The only term is selected; it has no rooms yet and the public application is unavailable.
    await expect(page.getByText("No rooms yet")).toBeVisible()
    await expect(page.getByText("The public application is temporarily unavailable.")).toBeVisible()
    await page.getByRole("button", { name: "Add room" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Room name").fill("Pokoj E2E")
    await dialog.getByLabel("Capacity (beds)").fill("5")
    await dialog.getByRole("button", { name: "Add room" }).click()
    await expect(page.getByText("Pokoj E2E", { exact: true })).toBeVisible()

    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Overview" })
      .click()
    const link = await page.getByRole("link", { name: /\/apply\// }).innerText()
    await expect(page.getByRole("button", { name: /Copy/ })).toHaveCount(1)
    await page.getByRole("button", { name: "Copy link", exact: true }).click()
    await expect(page.getByText("Link copied to the clipboard")).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link)
  })
})
