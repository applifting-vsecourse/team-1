import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { signIn } from "./support/auth"

// US-29: the seeded „Letní kemp 2027“ has rooms by gender. Other tests submit applications to it,
// so the test checks the wiring (tab, real API, filtered links), not exact counts.
test.describe("Capacity", () => {
  test("organizer opens an event's capacity and a term's detail links to filtered applications", async ({
    page,
  }) => {
    await signIn(page, "organizer", ORGANIZER)
    await expect(page.getByRole("heading", { level: 1, name: "Event list" })).toBeVisible()

    await page.goto("/organizer/events")
    await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()
    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Capacity" })
      .click()

    // Every term is a row linking to its detail.
    await expect(page.getByRole("heading", { name: "Occupancy of all terms" })).toBeVisible()
    await page.getByRole("main").getByRole("list").getByRole("link").first().click()

    // The card of the women is the link to their confirmed applications.
    const women = page.getByRole("link", { name: /^Women · capacity \d+ beds/ })
    await expect(women).toBeVisible()
    await expect(page.getByRole("link", { name: /^Men · capacity \d+ beds/ })).toBeVisible()
    await expect(women).toHaveAttribute("href", /status=CONFIRMED/)
    await expect(women).toHaveAttribute("href", /gender=FEMALE/)
  })
})
