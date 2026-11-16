import { expect, test } from "@playwright/test"
import { MOUNTAIN_WEEKEND_TOKEN, ORGANIZER, PARTICIPANT } from "./support/accounts"
import { fillSignInForm, openEventList, signIn, signOut } from "./support/auth"
import { eventIdByPublicToken } from "./support/events"

// US-96 landing → US-02 sign-in and sign-out, and the boundary between the two account types.
// Edge cases (wrong password, 401/403 of the API) live in Vitest and *.int-spec.ts (docs/E2E.md).
test.describe("Sign-in", () => {
  test("organizer gets from the landing page to the events list and signs out", async ({
    page,
  }) => {
    await page.goto("/")
    // The landing repeats the entry links; the first one is in the hero.
    await page.getByRole("link", { name: "I'm an organizer" }).first().click()
    await expect(page).toHaveURL(/\/organizer\/login/)

    await fillSignInForm(page, ORGANIZER)
    await openEventList(page)

    // The account menu sits at the bottom of the sidebar.
    await page
      .getByRole("complementary")
      .getByRole("button", { name: /organizator@example\.com/ })
      .click()
    await page.getByRole("menuitem", { name: "Sign out" }).click()
    // Sign-out ends on the landing page; leaving earlier would abort the request and keep the session.
    await expect(page).toHaveURL(/\/$/)
    await page.goto("/organizer")
    await expect(page).toHaveURL(/\/organizer\/login/)
  })

  test("organizer lands on the overview of the event opened last (US-51)", async ({ page }) => {
    await signIn(page, "organizer", ORGANIZER)
    await openEventList(page)
    const remembered = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" && response.url().endsWith("/last-opened"),
    )
    await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()
    await expect(page).toHaveURL(/\/organizer\/events\/[^/]+$/)
    expect((await remembered).status()).toBe(204)
    const eventUrl = page.url()
    await expect(page.getByRole("combobox", { name: "Event" })).toBeVisible()

    await signOut(page, ORGANIZER)
    await expect(page).toHaveURL(/\/$/)
    await signIn(page, "organizer", ORGANIZER)
    await expect(page).toHaveURL(eventUrl)
  })

  test(
    "participant signs in with a password and signs out",
    { tag: "@mobile" },
    async ({ page }) => {
      await signIn(page, "participant", PARTICIPANT)
      await expect(page.getByRole("heading", { level: 1, name: "Your applications" })).toBeVisible()

      await signOut(page, PARTICIPANT)
      // Sign-out ends on the landing page; leaving earlier would abort the request and keep the session.
      await expect(page).toHaveURL(/\/$/)
      await page.goto("/participant")
      await expect(page).toHaveURL(/\/participant\/login/)
    },
  )

  test("participant cannot open the organizer area", async ({ page }) => {
    await signIn(page, "participant", PARTICIPANT)
    await expect(page.getByRole("heading", { level: 1, name: "Your applications" })).toBeVisible()

    await page.goto("/organizer")
    await expect(page.getByText("A participant account can't manage events.")).toBeVisible()
  })

  test("organizer cannot open another organization's event (US-10)", async ({ page }) => {
    const eventId = await eventIdByPublicToken(MOUNTAIN_WEEKEND_TOKEN)
    await signIn(page, "organizer", ORGANIZER)
    await openEventList(page)

    await page.goto(`/organizer/events/${eventId}`)
    await expect(page.getByText("403 · The requested record isn't available to you.")).toBeVisible()
    await expect(page.getByText("Horský víkend 2027")).toHaveCount(0)
    await page.getByRole("link", { name: "My events" }).click()
    await expect(page).toHaveURL(/\/organizer\/events$/)
  })
})
