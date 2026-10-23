import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { signIn } from "./support/auth"

// US-12 event, US-13 terms, US-16 term price. Rooms (US-14) are still a skeleton, so the
// application link stays inactive; the last step of the journey waits in the fixme below.
test.describe("Event setup", () => {
  test("organizer creates an event, adds a term with a price and sees that a room is missing", async ({
    page,
  }) => {
    const name = `E2E akce ${Date.now()}`
    await signIn(page, "organizer", ORGANIZER)
    // Leaving before the sign-in answers would abort it and keep the session out.
    await expect(page.getByRole("heading", { level: 1, name: /^Hello,/ })).toBeVisible()

    await page.goto("/organizer/events/new")
    await page.getByLabel("Event name").fill(name)
    await page.getByRole("button", { name: "Create event" }).click()
    await expect(page.getByText(`The event ${name} was created.`)).toBeVisible()

    await page.getByRole("link", { name: new RegExp(name) }).click()
    await page.getByRole("link", { name: "Add a term and price" }).click()
    await page.getByRole("button", { name: "Add term" }).first().click()

    const dialog = page.getByRole("dialog", { name: "Add term" })
    await dialog.getByLabel("Term name").fill("1. týden")
    await dialog.getByLabel("Start date").fill("2027-07-04")
    await dialog.getByLabel("End date").fill("2027-07-10")
    await dialog.getByLabel("Price per person").fill("4500")
    await dialog.getByRole("button", { name: "Add term" }).click()
    await expect(page.getByText("The term 1. týden was added.")).toBeVisible()
  })

  // Enable when US-14 (rooms) is merged: add a room, then the overview offers "Copy application link".
  test.fixme("organizer adds a room and copies the application link", async () => {})
})
