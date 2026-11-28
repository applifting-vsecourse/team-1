import { expect, type Page } from "@playwright/test"
import type { Account } from "./accounts"

/** Signs in through the real form on /organizer/login or /participant/login. */
export async function signIn(page: Page, area: "organizer" | "participant", account: Account) {
  await page.goto(`/${area}/login`)
  await fillSignInForm(page, account)
}

export async function fillSignInForm(page: Page, account: Account) {
  // The participant page has a second e-mail field (ask for a new link): stay in the sign-in form.
  const form = page.locator("form").filter({ has: page.getByLabel("Password", { exact: true }) })
  await form.getByLabel("E-mail").fill(account.email)
  await form.getByLabel("Password", { exact: true }).fill(account.password)
  await form.getByRole("button", { name: "Sign in" }).click()
}

/**
 * Signs out through the account menu: the account at the bottom of the sidebar, on a phone the
 * avatar in the header (there is no drawer since Figma F4 / F5).
 */
export async function signOut(page: Page, account: Account) {
  await page.getByRole("button", { name: account.email }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
}

/**
 * After the organizer signs in, waits until the sign-in answered and opens the events list. The
 * administration lands on the event opened last (US-51), so the landing depends on earlier tests.
 */
export async function openEventList(page: Page) {
  await expect(page).toHaveURL(/\/organizer\/events/)
  await page.goto("/organizer/events")
  await expect(page.getByRole("heading", { level: 1, name: "Events" })).toBeVisible()
}
