import { expect, test } from "@playwright/test"
import { ORGANIZER, PARTICIPANT } from "./support/accounts"
import { openEventList, signIn, signOut } from "./support/auth"

test("participant submits a cancellation request and organizer declines it at 360 px", async ({
  page,
}) => {
  await signIn(page, "organizer", ORGANIZER)
  await openEventList(page)
  await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()
  await page
    .getByRole("navigation", { name: "Event sections" })
    .getByRole("link", { name: "Settings" })
    .click()
  await page.getByRole("checkbox", { name: "Set a cancellation start date" }).check()
  const cancellationDate = page.getByRole("textbox", { name: "Cancellation rules apply from" })
  await cancellationDate.clear()
  await cancellationDate.fill("01/07/2026")
  await page.getByRole("button", { name: "Save settings" }).click()
  await expect(page.getByText("Date saved.", { exact: true })).toBeVisible()
  await signOut(page, ORGANIZER)
  await expect(page).toHaveURL(/\/$/)

  await signIn(page, "participant", PARTICIPANT)
  await page.setViewportSize({ width: 360, height: 800 })
  await page
    .getByRole("link", { name: /Letní kemp 2027/ })
    .first()
    .click()
  await page.getByRole("button", { name: "Cancel participation" }).click()
  await expect(page.getByRole("heading", { name: "Cancellation impact" })).toBeVisible()
  await page.getByRole("button", { name: "Send request" }).click()
  await expect(page.getByRole("heading", { name: "Request awaiting approval" })).toBeVisible()
  await page.getByRole("button", { name: "Back to application" }).click()
  await expect(page.getByRole("heading", { name: "Cancellation request" })).toBeVisible()
  await expect(
    page.getByText("Your request is awaiting the organiser's decision.", { exact: false }),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  await signOut(page, PARTICIPANT)
  await expect(page).toHaveURL(/\/$/)

  await signIn(page, "organizer", ORGANIZER)
  await openEventList(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()
  await page
    .getByRole("navigation", { name: "Event sections" })
    .getByRole("link", { name: "Applications" })
    .click()
  await page.setViewportSize({ width: 360, height: 800 })
  await page.getByRole("radio", { name: "Change requests" }).click()
  await page.getByRole("button", { name: "Review request" }).click()
  const review = page.getByRole("dialog", { name: "Review request" })
  await expect(review.getByRole("heading", { name: "Review request" })).toBeVisible()
  await review.getByRole("textbox", { name: "Reason for declining" }).fill("Please contact us")
  await review.getByRole("button", { name: "Decline request" }).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  await review.getByRole("button", { name: "Decline request" }).click()
  await expect(page.getByText("Request declined")).toBeVisible()
})
