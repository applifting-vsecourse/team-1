import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { openEventList, signIn } from "./support/auth"

test("organizer sets the cancellation start date in a usable 360 px settings screen", async ({
  page,
}) => {
  await signIn(page, "organizer", ORGANIZER)
  await openEventList(page)
  await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()
  await page
    .getByRole("navigation", { name: "Event sections" })
    .getByRole("link", { name: "Settings" })
    .click()
  await page.setViewportSize({ width: 360, height: 800 })

  await expect(page.getByRole("heading", { name: "Approval of participant requests" })).toBeVisible()
  await expect(
    page.getByText("Approval is off. Participant requests are carried out immediately."),
  ).toBeVisible()
  await page.getByRole("checkbox", { name: "Turn on approval" }).check()
  await page.getByRole("textbox", { name: "Approve requests from" }).fill("01/07/2035")
  await page.getByRole("button", { name: "Save settings" }).scrollIntoViewIfNeeded()
  await expect(page.getByRole("button", { name: "Save settings" })).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Approval is set.")).toBeVisible()
})
