import { expect, test, type Page } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { expectOutlinedAction } from "./support/action-appearance"
import { openEventList, signIn } from "./support/auth"

test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true })

async function openTransportWithOwnOption(page: Page) {
  await signIn(page, "organizer", ORGANIZER)
  await openEventList(page)
  const event = page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ })
  await page.goto(`${await event.getAttribute("href")}/transport`)
  const showParticipants = page.getByRole("link", {
    name: "Show participants of transport Own transport",
  })
  const addTransport = page.getByRole("button", { name: "Add transport", exact: true })
  await expect(addTransport).toBeVisible()
  if (!(await showParticipants.isVisible())) {
    await addTransport.tap()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("radio", { name: "Own transport" }).tap()
    await dialog.getByRole("button", { name: "Add transport", exact: true }).tap()
  }
  return showParticipants
}

test("transport actions fit a 360 px screen and work by touch and keyboard", async ({ page }) => {
  const showParticipants = await openTransportWithOwnOption(page)
  await expectOutlinedAction(showParticipants)
  await showParticipants.scrollIntoViewIfNeeded()
  await expect(showParticipants).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360)

  await showParticipants.tap()
  await expect(page.getByRole("heading", { name: "Own transport · participants" })).toBeVisible()
  const back = page.getByRole("link", { name: "Back to transport" })
  await expectOutlinedAction(back)
  await back.tap()
  await expect(showParticipants).toBeVisible()

  await page.getByRole("button", { name: "Delete transport Own transport" }).focus()
  await page.keyboard.press("Tab")
  await expect(showParticipants).toBeFocused()
  await expect(showParticipants).toHaveCSS("outline-style", "solid")
  await expect(showParticipants).toHaveCSS("outline-width", "2px")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("heading", { name: "Own transport · participants" })).toBeVisible()
})
