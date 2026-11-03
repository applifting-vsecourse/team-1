import type { Page } from "@playwright/test"
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
 * Signs out through the account menu at the bottom of the sidebar; on a phone
 * the sidebar is a sheet that the menu button of the top bar opens first.
 */
export async function signOut(page: Page, account: Account) {
  const openMenu = page.getByRole("button", { name: "Open navigation" })
  if (await openMenu.isVisible()) await openMenu.click()
  await page.getByRole("button", { name: account.email }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()
}
