import { expect, type Locator, type Page, test } from "@playwright/test"
import { MOUNTAIN_ORGANIZER, ORGANIZER } from "./support/accounts"
import { openEventList, signIn } from "./support/auth"

async function openEventSection(
  page: Page,
  section: string,
  width: number,
  height: number,
  event = { account: ORGANIZER, name: /Letní kemp 2027(?! – demo)/ },
) {
  await signIn(page, "organizer", event.account)
  await openEventList(page)
  await page.getByRole("link", { name: event.name }).click()
  await page
    .getByRole("navigation", { name: "Event sections" })
    .getByRole("link", { name: section })
    .click()
  await page.setViewportSize({ width, height })
}

async function closeBlockSavedToast(page: Page) {
  const toast = page
    .getByRole("region", { name: /^Notifications/ })
    .getByRole("listitem")
    .filter({ hasText: "Block saved" })
  await toast.getByRole("button", { name: "Close", exact: true }).click()
  await expect(toast).toBeHidden()
}

async function addBlock(page: Page, description = "") {
  const name = `E2E block ${Date.now()}`
  await page.getByRole("button", { name: "Add block", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Add block" })
  await dialog.getByLabel("Block name").fill(name)
  await dialog.getByLabel("Description").fill(description)
  await dialog.getByRole("button", { name: "Add block" }).click()
  await expect(dialog).toBeHidden()
  await closeBlockSavedToast(page)
  return name
}

async function openBlock(page: Page, name: string, action: "Edit" | "Delete block") {
  await page.getByRole("button", { name: `Show details of ${name}` }).click()
  await page
    .getByRole("dialog", { name })
    .getByRole("button", { name: action, exact: true })
    .click()
}

async function expectDialogToFit(dialog: Locator, width: number, height: number, top = 0) {
  // Measure the border box and any horizontal overflow after the opening animation.
  await expect
    .poll(() =>
      dialog.evaluate(
        (element, bounds) => {
          const rect = element.getBoundingClientRect()
          return (
            rect.left >= 0 &&
            rect.right <= bounds.width &&
            rect.top >= bounds.top &&
            rect.bottom <= bounds.top + bounds.height &&
            element.scrollWidth <= element.clientWidth + 1
          )
        },
        { width, height, top },
      ),
    )
    .toBe(true)
}

async function expectScrollable(dialog: Locator) {
  await expect
    .poll(() => dialog.evaluate((element) => element.scrollHeight - element.clientHeight))
    .toBeGreaterThan(0)
}

async function simulateVisualViewport(page: Page, height: number, offsetTop = 0) {
  // Keep the layout viewport intact while emulating the area left by a software keyboard.
  await page.evaluate(
    ({ height, offsetTop }) => {
      const viewport = window.visualViewport
      if (!viewport) throw new Error("Chromium must expose VisualViewport")
      Object.defineProperties(viewport, {
        height: { value: height },
        offsetTop: { value: offsetTop },
      })
      viewport.dispatchEvent(new Event("resize"))
      viewport.dispatchEvent(new Event("scroll"))
    },
    { height, offsetTop },
  )
}

async function expectActionOrder(
  secondary: Locator,
  primary: Locator,
  direction: "column" | "row",
) {
  await (direction === "column" ? secondary : primary).scrollIntoViewIfNeeded()
  await expect(secondary).toBeInViewport()
  await expect(primary).toBeInViewport()
  const first = await secondary.boundingBox()
  const second = await primary.boundingBox()
  if (!first || !second) throw new Error("Both dialog actions must have a visible box")
  if (direction === "column") {
    expect(second.y + second.height).toBeLessThanOrEqual(first.y)
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

async function selectTerm(page: Page, name: RegExp) {
  await page.getByRole("combobox", { name: "Term", exact: true }).click()
  await page.getByRole("option", { name }).click()
}

async function confirmRoomProposal(page: Page, width: number, title: string, action: string) {
  const launch = page.getByRole("button", { name: action, exact: true })
  await launch.click()
  const dialog = page.getByRole("dialog", { name: title })
  const back = dialog.getByRole("button", { name: "Back to the proposal" })
  const confirm = dialog.getByRole("button", { name: action, exact: true })
  await expectDialogToFit(dialog, width, 480)
  await expectActionOrder(back, confirm, width === 360 ? "column" : "row")
  await back.click()
  await expect(dialog).toBeHidden()
  await launch.click()
  await confirm.click()
  await expect(dialog).toBeHidden()
}

for (const [index, width] of [360, 1280].entries()) {
  const direction = width === 360 ? "column" : "row"
  test(`short confirmation fits and can be closed or completed at ${width} px`, async ({
    page,
  }) => {
    await openEventSection(page, "Program", width, 800)
    const name = await addBlock(page)
    await page.getByRole("button", { name: `Show details of ${name}` }).click()
    const detail = page.getByRole("dialog", { name })
    const deleteBlock = detail.getByRole("button", { name: "Delete block" })
    await expectActionOrder(deleteBlock, detail.getByRole("button", { name: "Edit" }), direction)
    await deleteBlock.click()
    const dialog = page.getByRole("dialog", { name: "Delete block?" })
    const primary = dialog.getByRole("button", { name: "Delete block" })
    await expectDialogToFit(dialog, width, 800)
    await expectActionOrder(
      dialog.getByRole("button", { name: "Close", exact: true }).first(),
      primary,
      direction,
    )
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await openBlock(page, name, "Delete block")
    await primary.click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("button", { name: `Show details of ${name}` })).toHaveCount(0)
  })

  test(`long program copy preview scrolls and completes at ${width} px`, async ({ page }) => {
    await openEventSection(page, "Program", width, 480)
    await addBlock(page, "Long description for the program copy preview. ".repeat(40))
    await page.getByRole("combobox", { name: "Term", exact: true }).click()
    await page.getByRole("option").last().click()
    const dialog = await openCopyPreview(page)
    const copy = dialog.getByRole("button", { name: /^Copy \d+ blocks?$/ })
    await expectDialogToFit(dialog, width, 480)
    await expectScrollable(dialog)
    await expectActionOrder(dialog.getByRole("button", { name: "Back" }), copy, direction)
    await dialog.getByRole("button", { name: "Back" }).click()
    await expect(dialog).toBeHidden()
    await openCopyPreview(page)
    await copy.click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(/^Copied \d+ blocks?$/)).toBeVisible()
  })

  test(`program edit can validate, scroll and save at ${width} px`, async ({ page }) => {
    await openEventSection(page, "Program", width, 800)
    const name = await addBlock(page)
    await openBlock(page, name, "Edit")
    const dialog = page.getByRole("dialog", { name: "Edit block" })
    const nameField = dialog.getByLabel("Block name")
    await nameField.fill("")
    const visibleHeight = width === 360 ? 360 : 800
    await simulateVisualViewport(page, visibleHeight)
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
      direction,
    )
    await save.click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("button", { name: `Show details of ${name} edited` })).toBeVisible()
    await closeBlockSavedToast(page)
    await openBlock(page, `${name} edited`, "Edit")
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  })

  test(`room copy preview fits, scrolls and replaces rooms at ${width} px`, async ({ page }) => {
    // Use separate target terms and leave the common source term untouched.
    await openEventSection(page, "Accommodation", width, 480, {
      account: MOUNTAIN_ORGANIZER,
      name: /Zimní kurz 2027/,
    })
    await selectTerm(page, index === 0 ? /První týden/ : /Druhý týden/)
    const launch = page.getByRole("button", { name: "Copy rooms from term…" })
    await launch.click()
    const dialog = page.getByRole("dialog", { name: "Copy rooms to the term" })
    const preview = dialog.getByRole("button", { name: "Show preview" })
    const cancel = dialog.getByRole("button", { name: "Cancel" })
    await expectDialogToFit(dialog, width, 480)
    await expectActionOrder(cancel, preview, direction)
    await cancel.click()
    await expect(dialog).toBeHidden()
    await launch.click()
    await dialog.getByRole("combobox", { name: "Source term" }).click()
    await page.getByRole("option", { name: /Třetí týden/ }).click()
    await preview.click()
    await expectDialogToFit(dialog, width, 480)
    if (width === 360) await expectScrollable(dialog)
    const back = dialog.getByRole("button", { name: "Back", exact: true })
    await expectActionOrder(back, dialog.getByRole("button", { name: "Add 2 rooms" }), direction)
    await back.click()
    await preview.click()
    await dialog.getByRole("radio", { name: "Replace the existing rooms" }).click()
    await dialog.getByRole("button", { name: "Replace rooms" }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText("2 rooms copied", { exact: true })).toBeVisible()
  })

  test(`room proposal dialogs can edit, discard and save at ${width} px`, async ({ page }) => {
    await openEventSection(page, "Accommodation", width, 480)
    await selectTerm(page, new RegExp(`${index + 1}\\. týden`))
    const views = page.getByRole("radiogroup", { name: "Accommodation view" })
    const rooms = views.getByRole("radio", { name: "Rooms" })
    const assignment = views.getByRole("radio", { name: "Assignment" })
    const launch = page.getByRole("button", { name: "Propose distribution" })
    const publication = page.getByRole("switch", { name: "Publish the room assignment" })

    await rooms.click()
    await expect(rooms).toBeChecked()
    await expect(publication).not.toBeChecked()
    await publication.click()
    await expect(publication).toBeChecked()
    await assignment.click()
    await expect(publication).toBeChecked()
    await publication.click()
    await expect(publication).not.toBeChecked()
    await rooms.click()

    await launch.click()
    const edit = page.getByRole("button", { name: /^Edit assignment:/ }).first()
    await edit.click()
    const dialog = page.getByRole("dialog", { name: "Edit assignment" })
    const cancel = dialog.getByRole("button", { name: "Cancel" })
    const apply = dialog.getByRole("button", { name: "Use in proposal" })
    await expectDialogToFit(dialog, width, 480)
    await expectActionOrder(cancel, apply, direction)
    await cancel.click()
    await expect(dialog).toBeHidden()
    await edit.click()
    if (width === 360) await expectScrollable(dialog)
    await dialog.getByRole("radio").last().click()
    await apply.click()
    await expect(dialog).toBeHidden()

    await confirmRoomProposal(page, width, "Discard the proposal?", "Discard proposal")
    await expect(rooms).toBeChecked()
    await assignment.click()
    await launch.press("Enter")
    await rooms.click()
    await confirmRoomProposal(page, width, "Save the distribution?", "Save distribution")
    await expect(page.getByText("Distribution saved", { exact: true })).toBeVisible()
  })

  test(`payment cancellation and meal editing order actions for ${width} px`, async ({ page }) => {
    await openEventSection(page, "Applications", width, 800)
    await page.getByRole("searchbox", { name: "Search applications" }).fill("Tomáš Dvořák")
    await expect(page.getByRole("heading", { name: "1 application", exact: true })).toBeVisible()
    await page.getByRole("link", { name: /^Record payment/ }).click()
    const cancelRecord = page
      .getByRole("list", { name: "Payment history" })
      .getByRole("button", { name: "Cancel record", exact: true })
    await cancelRecord.click()
    const payment = page.getByRole("dialog", { name: "Cancel this payment record?" })
    const back = payment.getByRole("button", { name: "Back", exact: true })
    await expect(back).toBeFocused()
    await expectActionOrder(back, payment.getByRole("button", { name: "Cancel record" }), direction)
    await back.click()
    await expect(payment).toBeHidden()
    await expect(cancelRecord).toBeEnabled()

    await page.getByRole("button", { name: "Edit meals for Tomáš Dvořák" }).click()
    const meals = page.getByRole("dialog", { name: "Edit meal preferences" })
    const cancel = meals.getByRole("button", { name: "Cancel", exact: true })
    const save = meals.getByRole("button", { name: "Save meals" })
    await expectActionOrder(cancel, save, direction)
    await cancel.focus()
    await page.keyboard.press("Tab")
    await expect(save).toBeFocused()
    await cancel.click()
    await expect(meals).toBeHidden()
  })

  test(`unused transport confirmation puts Cancel before Delete option at ${width} px`, async ({
    page,
  }) => {
    await openEventSection(page, "Transport", width, 800)
    await selectTerm(page, new RegExp(`${index + 1}\\. týden`))
    await page.getByRole("button", { name: "Add transport", exact: true }).click()
    const editor = page.getByRole("dialog", { name: "Add transport" })
    await editor.getByRole("radio", { name: "Own transport" }).click()
    await editor.getByRole("button", { name: "Add transport" }).click()
    await expect(editor).toBeHidden()

    const open = page.getByRole("button", { name: "Delete transport Own transport" })
    await open.click()
    const dialog = page.getByRole("dialog", { name: "Delete transport option?" })
    const cancel = dialog.getByRole("button", { name: "Cancel", exact: true })
    const remove = dialog.getByRole("button", { name: "Delete option" })
    await expectActionOrder(cancel, remove, "row")
    await cancel.click()
    await expect(dialog).toBeHidden()
    await open.click()
    await remove.click()
    await expect(dialog).toBeHidden()
    await expect(open).toHaveCount(0)
  })
}

test("participant details stay reachable when the mobile visual viewport pans", async ({
  page,
}) => {
  await openEventSection(page, "Applications", 360, 800)
  await page.getByRole("link", { name: "Record payment" }).first().click()
  await page
    .getByRole("group", { name: "Participant details" })
    .getByRole("button", { name: "Edit", exact: true })
    .click()
  const dialog = page.getByRole("dialog", { name: "Edit participant details" })
  await dialog.getByLabel("First name").fill("")
  await simulateVisualViewport(page, 360, 80)
  await expectDialogToFit(dialog, 360, 360, 80)
  await dialog.getByRole("button", { name: "Save changes" }).click()
  await expect(dialog.getByText("Enter the first name.")).toBeVisible()
  const close = dialog.getByRole("button", { name: "Close", exact: true })
  await close.scrollIntoViewIfNeeded()
  await expect.poll(async () => (await close.boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(80)
  await close.click()
  await expect(dialog).toBeHidden()
})
