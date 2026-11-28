import { expect, test } from "@playwright/test"
import { MOUNTAIN_WEEKEND_TOKEN, ORGANIZER, PARTICIPANT } from "./support/accounts"
import { fillSignInForm, openEventList, signIn, signOut } from "./support/auth"
import { eventIdByPublicToken } from "./support/events"

// US-96 landing → US-02 sign-in and sign-out, and the boundary between the two account types.
// Edge cases (wrong password, 401/403 of the API) live in Vitest and *.int-spec.ts (docs/E2E.md).
test.describe("Sign-in", () => {
  test("participant can request a new sign-in link", { tag: "@mobile" }, async ({ page }) => {
    await page.goto("/participant/login")
    // „No password?“ turns the same card into the link request.
    await page.getByRole("button", { name: "No password?" }).click()
    await expect(page).toHaveURL(/\/participant\/login$/)
    await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeVisible()
  })

  test("organizer gets from the landing page to the events list and signs out", async ({
    page,
  }) => {
    await page.goto("/")
    // The hero leads new organizers to registration; an existing one signs in from the footer.
    await page
      .getByRole("contentinfo")
      .getByRole("navigation", { name: "For organizers" })
      .getByRole("link", { name: "Sign in" })
      .click()
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
    await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Letní kemp 2027" })).toBeVisible()
    await expect(page.getByRole("combobox", { name: "Event", exact: true })).toHaveCount(0)
    await page.getByRole("link", { name: "All events", exact: true }).click()
    await expect(page).toHaveURL(/\/organizer\/events$/)

    const remembered = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" && response.url().endsWith("/last-opened"),
    )
    await page.getByRole("link", { name: /Letní kemp 2027 – demo/ }).click()
    await expect(page).toHaveURL(/\/organizer\/events\/[^/]+$/)
    expect((await remembered).status()).toBe(204)
    const eventUrl = page.url()
    await expect(
      page.getByRole("heading", { level: 1, name: "Letní kemp 2027 – demo" }),
    ).toBeVisible()

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
      await expect(page.getByRole("heading", { level: 1, name: "My applications" })).toBeVisible()

      await signOut(page, PARTICIPANT)
      // Sign-out ends on the landing page; leaving earlier would abort the request and keep the session.
      await expect(page).toHaveURL(/\/$/)
      await page.goto("/participant")
      await expect(page).toHaveURL(/\/participant\/login/)
    },
  )

  test("participant cannot open the organizer area", async ({ page }) => {
    await signIn(page, "participant", PARTICIPANT)
    await expect(page.getByRole("heading", { level: 1, name: "My applications" })).toBeVisible()

    await page.goto("/organizer")
    await expect(
      page.getByRole("heading", { level: 1, name: "You don't have access to this content" }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "My applications" })).toBeVisible()
  })

  test("organizer cannot open another organization's event (US-10)", async ({ page }) => {
    const eventId = await eventIdByPublicToken(MOUNTAIN_WEEKEND_TOKEN)
    await signIn(page, "organizer", ORGANIZER)
    await openEventList(page)

    await page.goto(`/organizer/events/${eventId}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "You don't have access to this content" }),
    ).toBeVisible()
    await expect(page.getByText("Horský víkend 2027")).toHaveCount(0)
    await page.getByRole("link", { name: "Go to events", exact: true }).click()
    await expect(page).toHaveURL(/\/organizer\/events$/)
  })
})

test.describe("Organizer workspace at 360 px", () => {
  test.use({ viewport: { width: 360, height: 800 } })

  // Figma F5: no drawer — the avatar in the 56 px header opens the account menu with the navigation.
  test("opens the account menu and the program editor from the mobile workspace", async ({
    page,
  }) => {
    await signIn(page, "organizer", ORGANIZER)
    await openEventList(page)
    await expect(page.getByRole("button", { name: "Open navigation" })).toHaveCount(0)
    const openMenu = page
      .getByRole("banner")
      .getByRole("button", { name: /organizator@example\.com/ })
    await openMenu.click()
    const menu = page.getByRole("menu")
    await expect(menu.getByRole("menuitem", { name: "Events" })).toBeVisible()
    await expect(menu.getByRole("menuitem", { name: "Account settings" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(menu).toBeHidden()

    const eventId = await eventIdByPublicToken("demo-letni-kemp-2027")
    await page.goto(`/organizer/events/${eventId}/program`)
    await page.getByRole("button", { name: "Add block" }).click()
    const dialog = page.getByRole("dialog", { name: "Add block" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel("Block name")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(openMenu).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  })
})
