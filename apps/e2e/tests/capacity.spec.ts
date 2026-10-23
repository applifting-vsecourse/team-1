import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { signIn } from "./support/auth"

// US-29: the seeded „Letní kemp 2027“ has rooms by gender. Other tests submit applications to it,
// so the test checks the wiring (tab, real API, filtered links), not exact counts.
test.describe("Capacity", () => {
  test("organizer opens an event's capacity and the confirmed count links to filtered applications", async ({
    page,
  }) => {
    await signIn(page, "organizer", ORGANIZER)
    await expect(page.getByRole("heading", { level: 1, name: /^Hello,/ })).toBeVisible()

    await page.goto("/organizer/events")
    await page.getByRole("link", { name: /Letní kemp 2027/ }).click()
    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Capacity" })
      .click()

    const women = page.getByRole("heading", { name: /^Women · capacity \d+ beds$/ })
    await expect(women).toBeVisible()
    await expect(page.getByRole("heading", { name: /^Men · capacity \d+ beds$/ })).toBeVisible()

    // The first count on the page is the confirmed women of the selected term.
    const confirmed = page.getByRole("main").getByRole("link", { name: /^\d+$/ }).first()
    await expect(confirmed).toHaveAttribute("href", /status=CONFIRMED/)
    await expect(confirmed).toHaveAttribute("href", /gender=FEMALE/)
  })
})
