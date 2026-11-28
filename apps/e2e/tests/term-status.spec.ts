import { expect, test, type Locator, type Page } from "@playwright/test"
import { ORGANIZER, SUMMER_CAMP_LINK } from "./support/accounts"
import { openEventList, signIn } from "./support/auth"

type Activate = (locator: Locator) => Promise<void>

async function applyForFirstTerm(page: Page, activate: Activate, lastName: string) {
  await page.goto(SUMMER_CAMP_LINK)
  await page.getByLabel("First name").fill("Karel")
  await page.getByLabel("Last name").fill(lastName)
  await page.getByLabel("Date of birth").fill("2012-05-12")
  await activate(page.getByRole("combobox", { name: "Gender" }))
  await activate(page.getByRole("option", { name: "Man", exact: true }))
  await activate(
    page
      .getByRole("group", { name: /Choose at least one term/ })
      .getByRole("checkbox")
      .first(),
  )
  await page.getByLabel("Contact e-mail").fill(`${lastName.toLowerCase()}@example.com`)
  await activate(page.getByLabel(/I agree to the processing/))
  await activate(page.getByRole("button", { name: "Continue to review" }))
  await activate(page.getByRole("button", { name: "Submit application" }))
  await expect(page).toHaveURL(/\/apply\/confirmation\//)
}

async function openApplication(page: Page, activate: Activate, lastName: string, isPhone: boolean) {
  await signIn(page, "organizer", ORGANIZER)
  await openEventList(page)
  await activate(page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }))
  const sections = page.getByRole("navigation", { name: "Event sections" })
  if (isPhone) {
    await activate(sections.getByRole("button", { name: "Overview", exact: true }))
    await activate(
      page
        .getByRole("dialog", { name: "Event sections" })
        .getByRole("link", { name: "Applications", exact: true }),
    )
  } else {
    await activate(sections.getByRole("link", { name: "Applications", exact: true }))
  }
  const search = page.getByRole("searchbox", { name: "Search applications" })
  await search.fill(lastName)
  await search.press("Enter")
  const detail = page.getByRole("link", { name: "Record payment" })
  await expect(detail).toHaveCount(1)
  await activate(detail)
}

async function payAndReopenDetails(page: Page, activate: Activate, hasReducedMotion: boolean) {
  const record = page.getByRole("button", { name: "Record payment for the term" })
  const dialog = page.getByRole("dialog", { name: "Record payment" })
  await activate(record)
  await expect(dialog).toHaveCSS("animation-name", hasReducedMotion ? "none" : "dialog-appear")
  await activate(dialog.getByRole("button", { name: "Cancel", exact: true }))
  await activate(record)
  await expect(dialog.getByRole("radio", { name: /^Pay the remaining/ })).toBeChecked()
  await activate(dialog.getByRole("button", { name: "Record payment", exact: true }))
  await expect(dialog).not.toBeVisible()

  const paidTerm = page.getByRole("button", { name: /\bPaid\b/ })
  const details = page.getByRole("region", { name: /\bPaid\b/ })
  await expect(paidTerm).toHaveAttribute("aria-expanded", "false")
  await activate(paidTerm)
  await expect(details).toHaveCSS("animation-name", hasReducedMotion ? "none" : "accordion-down")
  await activate(paidTerm)
  await expect(paidTerm).toHaveAttribute("aria-expanded", "false")
  await activate(paidTerm)
  await expect(paidTerm).toHaveAttribute("aria-expanded", "true")
  await expect(details.getByRole("heading", { name: "Payment details" })).toBeVisible()
  await activate(details.getByRole("button", { name: "Record payment for the term" }))
  await activate(dialog.getByRole("button", { name: "Cancel", exact: true }))
}

// Exercise the same organizer journey in the desktop project with mouse or a 360 px touch context.
for (const device of ["desktop", "360 px phone"]) {
  const isPhone = device === "360 px phone"
  test.describe(`Status in a term on ${device}`, () => {
    if (isPhone) {
      test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true })
    }

    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      test(`reopens payment controls and withdraws a participant (${reducedMotion})`, async ({
        page,
      }) => {
        await page.emulateMedia({ reducedMotion })
        const activate: Activate = (locator) => (isPhone ? locator.tap() : locator.click())
        const lastName = `Zruseny-${Date.now()}`
        await applyForFirstTerm(page, activate, lastName)
        await openApplication(page, activate, lastName, isPhone)
        await payAndReopenDetails(page, activate, reducedMotion === "reduce")

        await activate(page.getByRole("button", { name: "Withdraw", exact: true }))
        const dialog = page.getByRole("dialog")
        await expect(
          dialog.getByRole("heading", { name: "Impact of the withdrawal" }),
        ).toBeVisible()
        await activate(dialog.getByRole("button", { name: "Withdraw participant" }))
        const confirmation = page.getByText("The participant was withdrawn", { exact: true })
        await expect(confirmation).toBeInViewport({ ratio: 1 })
        const toast = page.getByRole("listitem").filter({ has: confirmation })
        await expect(toast).toHaveCSS("opacity", "1")
        if (reducedMotion === "reduce") {
          await expect(toast).toHaveCSS("transition-property", "none")
        } else {
          await expect(toast).toHaveCSS("transition-duration", "0.18s")
        }
        await expect(page.getByText(/Confirmed → Cancelled/).first()).toBeVisible()
        await expect(page.getByRole("button", { name: "Withdraw", exact: true })).not.toBeVisible()
      })
    }
  })
}
