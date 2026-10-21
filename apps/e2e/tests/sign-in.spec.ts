import { expect, test } from "@playwright/test"
import { API_URL, ORGANIZER, PARTICIPANT } from "./support/accounts"
import { fillSignInForm, signIn } from "./support/auth"

// US-96 landing → US-02 sign-in and sign-out, and the boundary between the two account types.
test.describe("Sign-in", () => {
  test("organizer gets from the landing page to the dashboard and signs out", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "I'm an organizer" }).click()
    await expect(page).toHaveURL(/\/organizer\/login/)

    await fillSignInForm(page, ORGANIZER)
    await expect(page.getByRole("heading", { level: 1, name: /^Hello,/ })).toBeVisible()

    await page.goto("/organizer/account")
    await page.getByRole("main").getByRole("button", { name: "Sign out" }).click()
    await page.goto("/organizer")
    await expect(page).toHaveURL(/\/organizer\/login/)
  })

  test(
    "participant signs in with a password and signs out",
    { tag: "@mobile" },
    async ({ page }) => {
      await signIn(page, "participant", PARTICIPANT)
      await expect(page.getByRole("heading", { level: 1, name: "My application" })).toBeVisible()

      await page.goto("/participant/account")
      await page.getByRole("main").getByRole("button", { name: "Sign out" }).click()
      await page.goto("/participant")
      await expect(page).toHaveURL(/\/participant\/login/)
    },
  )

  test("wrong password keeps the organizer out", async ({ page }) => {
    await signIn(page, "organizer", { ...ORGANIZER, password: "wrong-password" })
    await expect(page.getByText("The e-mail or password is incorrect.")).toBeVisible()
    await expect(page).toHaveURL(/\/organizer\/login/)
  })

  test("participant cannot open the organizer area", async ({ page }) => {
    await signIn(page, "participant", PARTICIPANT)
    await expect(page.getByRole("heading", { level: 1, name: "My application" })).toBeVisible()

    await page.goto("/organizer")
    await expect(page.getByText("A participant account can't manage events.")).toBeVisible()
  })

  test("the server refuses the organizer API without a session and to a participant", async ({
    page,
  }) => {
    expect((await page.request.get(`${API_URL}/organizer/profile`)).status()).toBe(401)

    await signIn(page, "participant", PARTICIPANT)
    await expect(page.getByRole("heading", { level: 1, name: "My application" })).toBeVisible()
    expect((await page.request.get(`${API_URL}/organizer/profile`)).status()).toBe(403)
  })
})
