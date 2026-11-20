import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { openEventList, signIn } from "./support/auth"

// US-29: the seeded „Letní kemp 2027“ has rooms by gender. Other tests submit applications to it,
// so the test checks the wiring (tab, real API, filtered links), not exact counts.
test.describe("Capacity", () => {
  test("organizer opens an event's capacity and a term's detail links to filtered applications", async ({
    page,
  }) => {
    await signIn(page, "organizer", ORGANIZER)
    await openEventList(page)

    await page.goto("/organizer/events")
    await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()
    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Capacity" })
      .click()

    // Every term is a row linking to its detail.
    await expect(page.getByRole("heading", { name: "Occupancy of all terms" })).toBeVisible()
    await page.getByRole("main").getByRole("list").getByRole("link").first().click()

    // Each gender offers separate links to confirmed applications and the waitlist.
    const women = page.getByRole("link", { name: /^Women · capacity \d+ beds.*View applications/ })
    await expect(women).toBeVisible()
    await expect(
      page.getByRole("link", { name: /^Men · capacity \d+ beds.*View applications/ }),
    ).toBeVisible()
    await expect(women).toHaveAttribute("href", /status=CONFIRMED/)
    await expect(women).toHaveAttribute("href", /gender=FEMALE/)
    const waitlist = page.getByRole("link", { name: /^Women · capacity \d+ beds.*Waitlisted/ })
    await expect(waitlist).toHaveAttribute("href", /status=WAITLISTED/)
    await expect(waitlist).toHaveAttribute("href", /gender=FEMALE/)
    await women.click()
    await expect(page).toHaveURL(/\/applications\?term=.*status=CONFIRMED.*gender=FEMALE/)
  })
})
