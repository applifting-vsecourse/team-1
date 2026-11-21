import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { expectOutlinedAction } from "./support/action-appearance"
import { openEventList, signIn } from "./support/auth"

test.describe("Payments", () => {
  test("organizer sees an application in the list and records a payment", async ({ page }) => {
    await signIn(page, "organizer", ORGANIZER)
    await openEventList(page)
    await page.goto("/organizer/events")
    await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()
    const sections = page.getByRole("navigation", { name: "Event sections" })
    await sections.getByRole("link", { name: "Payments", exact: true }).click()
    const back = page.getByRole("link", { name: "All events", exact: true })
    const badge = page.getByText(/^(Applications open|Application inactive)$/)
    const details = page.getByRole("link", { name: /^Detail / })
    const detail = details.first()
    await page.mouse.move(0, 0)
    await expectOutlinedAction(back)
    await expectOutlinedAction(detail)
    await expect(badge).toBeVisible()
    const badgeRadius = await badge.evaluate((label) => getComputedStyle(label).borderTopLeftRadius)
    await expect(back).not.toHaveCSS("border-top-left-radius", badgeRadius)
    await expect(detail).toHaveCSS(
      "border-top-left-radius",
      await back.evaluate((link) => getComputedStyle(link).borderTopLeftRadius),
    )

    const rightEdge = (element: Element) => element.getBoundingClientRect().right
    expect(await detail.evaluate(rightEdge)).toBeCloseTo(await details.last().evaluate(rightEdge))

    await page.setViewportSize({ width: 360, height: 800 })
    await expect(detail.getByText("Payment detail")).toBeVisible()
    await expectOutlinedAction(detail)
    await detail.scrollIntoViewIfNeeded()
    await expect(detail).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360)
    await page.setViewportSize({ width: 1280, height: 720 })

    await sections.getByRole("link", { name: "Applications" }).click()
    await page.getByRole("combobox", { name: "Payment", exact: true }).click()
    await page.getByRole("option", { name: "Unpaid", exact: true }).click()
    const recordPayment = page.getByRole("link", { name: "Record payment" }).first()
    await page.mouse.move(0, 0)
    await expectOutlinedAction(recordPayment)
    await recordPayment.click()
    await page.getByRole("button", { name: "Record payment for the term" }).first().click()
    await page.getByLabel("Record another amount").check()
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: /^Amount/ })
      .fill("1")
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Record payment/ })
      .click()
    await expect(page.getByRole("dialog")).not.toBeVisible()
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: /Recorded by/ })
        .last(),
    ).toBeVisible()
  })
})
