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
