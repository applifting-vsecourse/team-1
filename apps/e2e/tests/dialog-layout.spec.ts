import { expect, type Locator, type Page, test } from "@playwright/test"
import { ORGANIZER } from "./support/accounts"
import { openEventList, signIn } from "./support/auth"

async function openProgram(page: Page, width: number, height: number) {
  await signIn(page, "organizer", ORGANIZER)
  await openEventList(page)
  await page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ }).click()
  await page
    .getByRole("navigation", { name: "Event sections" })
    .getByRole("link", { name: "Program" })
    .click()
  await page.setViewportSize({ width, height })
}

async function addBlock(page: Page, description = "") {
  const name = `E2E block ${Date.now()}`
  await page.getByRole("button", { name: "Add block", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Add block" })
  await dialog.getByLabel("Block name").fill(name)
  await dialog.getByLabel("Description").fill(description)
  await dialog.getByRole("button", { name: "Add block" }).click()
  await expect(dialog).toBeHidden()
  return name
}

async function openBlock(page: Page, name: string, action: "Edit" | "Delete block") {
  await page.getByRole("button", { name: `Show details of ${name}` }).click()
  await page
    .getByRole("dialog", { name })
    .getByRole("button", { name: action, exact: true })
    .click()
}

async function expectDialogToFit(dialog: Locator, width: number, height: number) {
  // Measure the border box and any horizontal overflow after the opening animation.
  await expect
    .poll(() =>
      dialog.evaluate(
        (element, bounds) => {
          const rect = element.getBoundingClientRect()
          return (
            rect.left >= 0 &&
            rect.right <= bounds.width &&
            rect.top >= 0 &&
            rect.bottom <= bounds.height &&
            element.scrollWidth <= element.clientWidth + 1
          )
        },
        { width, height },
      ),
    )
    .toBe(true)
}

async function expectActionOrder(secondary: Locator, primary: Locator, width: number) {
  await primary.scrollIntoViewIfNeeded()
  await expect(secondary).toBeInViewport()
  await expect(primary).toBeInViewport()
  const first = await secondary.boundingBox()
  const second = await primary.boundingBox()
  if (!first || !second) throw new Error("Both dialog actions must have a visible box")
  if (width === 360) {
    expect(first.y + first.height).toBeLessThanOrEqual(second.y)
    expect(Math.abs(first.x - second.x)).toBeLessThanOrEqual(1)
  } else {
    expect(first.x + first.width).toBeLessThanOrEqual(second.x)
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1)
  }
}

async function openCopyPreview(page: Page) {
  await page.getByRole("button", { name: "Copy program" }).click()
  const dialog = page.getByRole("dialog", { name: "Copy program" })
  await dialog.getByRole("combobox", { name: "Source term" }).click()
  await page.getByRole("option").first().click()
  return dialog
}

for (const width of [360, 1280]) {
  test(`short confirmation fits and can be closed or completed at ${width} px`, async ({
    page,
  }) => {
    await openProgram(page, width, 800)
    const name = await addBlock(page)
    await openBlock(page, name, "Delete block")
    const dialog = page.getByRole("dialog", { name: "Delete block?" })
    const primary = dialog.getByRole("button", { name: "Delete block" })
    await expectDialogToFit(dialog, width, 800)
    await expectActionOrder(
      dialog.getByRole("button", { name: "Close", exact: true }).first(),
      primary,
      width,
    )
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await openBlock(page, name, "Delete block")
    await primary.click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("button", { name: `Show details of ${name}` })).toHaveCount(0)
  })

  test(`long program copy preview scrolls and completes at ${width} px`, async ({ page }) => {
    await openProgram(page, width, 480)
    await addBlock(page, "Long description for the program copy preview. ".repeat(40))
    await page.getByRole("combobox", { name: "Term", exact: true }).click()
    await page.getByRole("option").last().click()
    const dialog = await openCopyPreview(page)
    const copy = dialog.getByRole("button", { name: /^Copy \d+ blocks?$/ })
    await expectDialogToFit(dialog, width, 480)
    await expect
      .poll(() => dialog.evaluate((element) => element.scrollHeight - element.clientHeight))
      .toBeGreaterThan(0)
    await expectActionOrder(dialog.getByRole("button", { name: "Back" }), copy, width)
    await dialog.getByRole("button", { name: "Back" }).click()
    await expect(dialog).toBeHidden()
    await openCopyPreview(page)
    await copy.click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(/^Copied \d+ blocks?$/)).toBeVisible()
  })

  test(`program edit can validate, scroll and save at ${width} px`, async ({ page }) => {
    await openProgram(page, width, 800)
    const name = await addBlock(page)
    await openBlock(page, name, "Edit")
    const dialog = page.getByRole("dialog", { name: "Edit block" })
    const nameField = dialog.getByLabel("Block name")
    await nameField.fill("")
    // Emulate only the visible area lost to a software keyboard while the layout stays 800 px.
    const visibleHeight = width === 360 ? 360 : 800
    await page.evaluate((height) => {
      const viewport = window.visualViewport
      if (!viewport) throw new Error("Chromium must expose VisualViewport")
      Object.defineProperty(viewport, "height", { value: height })
      viewport.dispatchEvent(new Event("resize"))
    }, visibleHeight)
    await expectDialogToFit(dialog, width, visibleHeight)
    const save = dialog.getByRole("button", { name: "Save changes" })
    await save.click()
    const message = dialog.getByText("Enter the block name.")
    await message.scrollIntoViewIfNeeded()
    await expect(message).toBeInViewport()
    await nameField.fill(`${name} edited`)
    await dialog.getByLabel("Place").fill("Meeting point")
    await dialog.getByLabel("Description").fill("Bring a notebook.")
    await expectActionOrder(
      dialog.getByRole("button", { name: "Close", exact: true }).first(),
      save,
      width,
    )
    await save.click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("button", { name: `Show details of ${name} edited` })).toBeVisible()
    await openBlock(page, `${name} edited`, "Edit")
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  })
}
