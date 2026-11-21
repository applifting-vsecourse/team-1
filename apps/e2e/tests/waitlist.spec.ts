import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { openEventList, signIn } from "./support/auth"

// US-30: the seeded full demo camp has waitlisted applicants; the organizer sees them in order.
test.describe("Waitlist", () => {
  test("organizer opens the waitlist and sees the waitlisted applicants in order", async ({
    page,
  }) => {
    await signIn(page, "organizer", ORGANIZER)
    await openEventList(page)
    await page.getByRole("link", { name: /Letní kemp 2027 – demo/ }).click()
    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Applications" })
      .click()

    // The occupancy page links to the same filter; the status filter is what the waitlist view needs.
    await page.goto(`${page.url()}?status=WAITLISTED`)
    await expect(page.getByText(/not a confirmed place/)).toBeVisible()
    await expect(page.getByText("Waitlisted · 1").first()).toBeVisible()
    const second = page
      .getByRole("row")
      .filter({ has: page.getByText("Waitlisted · 2", { exact: true }) })
      .first()
    await expect(second).toBeVisible()
    await second.getByRole("link", { name: "Detail" }).click()
    await expect(page.getByText("#2 on the waitlist", { exact: true })).toBeVisible()
    await page.setViewportSize({ width: 360, height: 800 })
    await expect(page.getByText("#2 on the waitlist", { exact: true })).toBeVisible()
    const waitlistedTerm = page.getByRole("listitem").filter({
      has: page.getByText("#2 on the waitlist", { exact: true }),
    })
    const changeStatus = waitlistedTerm.getByRole("button", { name: "Change status", exact: true })
    const changeTerm = waitlistedTerm.getByRole("button", { name: "Change term", exact: true })
    await expect(changeStatus).toBeVisible()
    await expect(changeTerm).toBeVisible()
    const [statusBounds, termBounds] = await Promise.all(
      [changeStatus, changeTerm].map((action) =>
        action.evaluate((button) => {
          const { bottom, left, top, width } = button.getBoundingClientRect()
          return { bottom, left, top, width }
        }),
      ),
    )

    expect(statusBounds.bottom).toBeLessThan(termBounds.top)
    expect(statusBounds.left).toBeCloseTo(termBounds.left)
    expect(statusBounds.width).toBeCloseTo(termBounds.width)

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(360)

    await changeStatus.click()
    await expect(page.getByRole("dialog").getByRole("combobox")).toBeVisible()
  })
})
