import { expect, type Locator } from "@playwright/test"

/** Checks the rendered boundary and touch size in the resting state. */
export async function expectOutlinedAction(action: Locator) {
  await expect(action).toBeVisible()
  await expect(action).toHaveCSS("border-top-style", "solid")
  await expect(action).toHaveCSS("border-top-width", "1px")
  await expect(action).not.toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)")
  expect(
    await action.evaluate((link) => link.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44)
}
