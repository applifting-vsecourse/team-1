import { expect, type Page } from "@playwright/test"
import { ORGANIZER } from "./accounts"
import { signIn } from "./auth"

/** Signs in as the organizer and creates an event named `name` with one term priced 4 500 CZK. */
export async function createEventWithTerm(page: Page, name: string) {
  await signIn(page, "organizer", ORGANIZER)
  // Leaving before the sign-in answers would abort it and keep the session out.
  await expect(page.getByRole("heading", { level: 1, name: "Event list" })).toBeVisible()

  await page.goto("/organizer/events/new")
  await page.getByLabel("Event name").fill(name)
  await page.getByRole("button", { name: "Create event" }).click()
  await expect(page.getByText(`The event ${name} was created.`)).toBeVisible()

  await page.getByRole("link", { name: new RegExp(name) }).click()
  await page.getByRole("link", { name: "Add a term and price" }).click()
  await page.getByRole("button", { name: "Add term" }).first().click()

  const dialog = page.getByRole("dialog", { name: "Add term" })
  await dialog.getByLabel("Term name").fill("1. týden")
  await dialog.getByLabel("Start date").fill("2027-07-04")
  await dialog.getByLabel("End date").fill("2027-07-10")
  await dialog.getByLabel("Price per person").fill("4500")
  await dialog.getByRole("button", { name: "Add term" }).click()
  await expect(page.getByText("The term 1. týden was added.")).toBeVisible()
}
