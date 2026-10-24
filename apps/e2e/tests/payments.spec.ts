import { expect, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { signIn } from "./support/auth"

test.describe("Payments", () => {
  test("organizer sees an application in the list and records a payment", async ({ page }) => {
    await signIn(page, "organizer", ORGANIZER)
    await expect(page.getByRole("heading", { level: 1, name: /^Hello,/ })).toBeVisible()
    await page.goto("/organizer/events")
    await page.getByRole("link", { name: /Letní kemp 2027/ }).click()
    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Applications" })
      .click()
    await page.getByRole("combobox", { name: "Payment", exact: true }).click()
    await page.getByRole("option", { name: "Unpaid", exact: true }).click()
    await page.getByRole("link", { name: "Record payment" }).first().click()
    await page.getByRole("button", { name: "Record payment", exact: true }).click()
    await page.getByLabel("Record another amount").check()
    await page.getByLabel("Amount of this payment (CZK)").fill("1")
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Record payment/ })
      .click()
    await expect(page.getByRole("dialog")).not.toBeVisible()
    await expect(page.getByRole("row", { name: /Manual entry/ }).last()).toBeVisible()
  })
})
