import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { signIn } from "./support/auth"

// US-29: the seeded „Letní kemp 2027“ has rooms by gender. Other tests submit applications to it,
// so the test checks the wiring (tab, real API, filtered links), not exact counts.
test.describe("Capacity", () => {
  test("organizer opens a term's capacity and the confirmed card links to filtered applications", async ({
    page,
  }) => {
    await signIn(page, "organizer", ORGANIZER)
    await expect(page.getByRole("heading", { level: 1, name: /^Hello,/ })).toBeVisible()

    await page.goto("/organizer/events")
    await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()
    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Capacity" })
      .click()

    await expect(page.getByRole("heading", { name: "Occupancy of all terms" })).toBeVisible()
    await page.getByRole("main").getByRole("list").getByRole("link").first().click()
    await expect(page).toHaveURL(/\/capacity\?termId=/)
    await expect(page.getByRole("heading", { name: /^Men · capacity \d+ beds$/ })).toBeVisible()

    const confirmed = page.getByRole("link", { name: /^Women · capacity \d+ beds/ })
    await expect(confirmed).toBeVisible()
    await expect(confirmed).toHaveAttribute("href", /status=CONFIRMED/)
    await expect(confirmed).toHaveAttribute("href", /gender=FEMALE/)
    await confirmed.click()
    await expect(page).toHaveURL(/\/applications\?term=.*status=CONFIRMED.*gender=FEMALE/)
  })
})
