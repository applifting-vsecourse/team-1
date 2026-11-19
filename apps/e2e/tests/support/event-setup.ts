import { expect, type Page } from "@playwright/test"
import { ORGANIZER } from "./accounts"
import { openEventList, signIn } from "./auth"

/** Signs in as the organizer and creates an event named `name` with one term priced 4 500 CZK. */
export async function createEventWithTerm(page: Page, name: string) {
  await signIn(page, "organizer", ORGANIZER)
  // Leaving before the sign-in answers would abort it and keep the session out.
  await openEventList(page)

  await page.goto("/organizer/events/new")
  const newEvent = page.getByRole("dialog")
  await newEvent.getByLabel("Event name").fill(name)
  await newEvent.getByRole("button", { name: "Create event" }).click()
  await expect(page.getByText(`The event ${name} was created.`)).toBeVisible()

  await page.getByRole("link", { name: new RegExp(name) }).click()
  await page.getByRole("link", { name: "Add a term and price" }).click()
  await page.getByRole("button", { name: "Add term" }).first().click()

  const dialog = page.getByRole("dialog", { name: "Add term" })
  await dialog.getByLabel("Term name").fill("1. týden")
  await dialog.getByLabel("Start date").fill("04/07/2027")
  await dialog.getByLabel("End date").fill("10/07/2027")
  await dialog.getByLabel("Term price").fill("4500")
  await dialog.getByRole("button", { name: "Add term" }).click()
  await expect(page.getByText("The term 1. týden was added.")).toBeVisible()
}

/** Adds one room of `capacity` beds to the event's only term, which opens the application link. */
export async function addRoom(page: Page, name = "Pokoj E2E", capacity = "5") {
  await page
    .getByRole("navigation", { name: "Event sections" })
    .getByRole("link", { name: "Overview" })
    .click()
  await page.getByRole("link", { name: "Add a room" }).click()
  await page.getByRole("button", { name: "Add room" }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Room name").fill(name)
  await dialog.getByLabel("Capacity").fill(capacity)
  await dialog.getByRole("button", { name: "Add room" }).click()
  await expect(page.getByRole("cell", { name, exact: true })).toBeVisible()
}
