import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { signIn } from "./support/auth"

// US-30: the seeded full demo camp has waitlisted applicants; the organizer sees them in order.
test.describe("Waitlist", () => {
  test("organizer opens the waitlist and sees the waitlisted applicants in order", async ({
    page,
  }) => {
    await signIn(page, "organizer", ORGANIZER)
    await expect(page.getByRole("heading", { level: 1, name: "Event list" })).toBeVisible()
    await page.getByRole("link", { name: /Letní kemp 2027 – demo/ }).click()
    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Applications" })
      .click()

    // The occupancy page links to the same filter; the status filter is what the waitlist view needs.
    await page.goto(`${page.url()}?status=WAITLISTED`)
    await expect(page.getByText(/not a confirmed place/)).toBeVisible()
    await expect(page.getByText("Waitlisted · 1").first()).toBeVisible()
    await expect(page.getByText("Waitlisted · 2").first()).toBeVisible()
  })
})
