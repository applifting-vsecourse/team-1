import { expect, type Page, test } from "@playwright/test"

const scrollsSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

// US-123 public catalog: organization → published event → event page → application form. Read only.
// The path starts on the landing page, which links to the catalog (US-138).
test.describe("Catalog of events", { tag: "@mobile" }, () => {
  test("visitor goes from the catalog through an organization and an event to the application", async ({
    page,
  }, testInfo) => {
    // Pixel 7 is 412 px wide; the story asks for 360 px.
    if (testInfo.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 })
    await page.goto("/")
    await page.getByRole("link", { name: "Browse events" }).click()
    await expect(page).toHaveURL(/\/catalog$/)
    await expect(page.getByRole("heading", { level: 1, name: "Event catalog" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Letní kemp 2027 – demo" })).toBeVisible()
    expect(await scrollsSideways(page)).toBe(false)
    // An event the organizer did not publish is not listed.
    await expect(page.getByRole("heading", { name: "Zimní výjezd 2028" })).toHaveCount(0)

    await page.getByRole("combobox", { name: "Organization" }).click()
    await page.getByRole("option", { name: "Letní kemp z. s." }).click()
    await page.getByRole("heading", { name: "Letní kemp 2027 – demo" }).click()

    await expect(
      page.getByRole("heading", { level: 1, name: "Letní kemp 2027 – demo" }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/events\/demo-letni-kemp-plny/)
    expect(await scrollsSideways(page)).toBe(false)

    await page.getByRole("link", { name: "Submit application" }).click()
    await expect(page).toHaveURL(/\/apply\/demo-letni-kemp-plny/)
    await expect(
      page.getByRole("region", { name: "Application for Letní kemp 2027 – demo" }),
    ).toBeVisible()
  })

  test("an event without a working application link has no page", async ({ page }) => {
    await page.goto("/events/demo-zimni-vyjezd-2028")

    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Zimní výjezd 2028" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Submit application" })).toHaveCount(0)
  })
})
