import { expect, test, type Locator, type Page } from "@playwright/test"
import { ORGANIZER, PARTICIPANT } from "./support/accounts"
import { openEventList, signIn, signOut } from "./support/auth"

const camp = /Letní kemp 2027(?! – demo)/
const sunday = "Sunday, 04/07/2027"
const monday = "Monday, 05/07/2027"

async function chooseDay(page: Page, combobox: Locator, day: string) {
  await combobox.click()
  await page.getByRole("option", { name: day, exact: true }).click()
  await expect(combobox).toHaveText(day)
}

async function addBlock(
  page: Page,
  { name, start, end }: { name: string; start: string; end: string },
) {
  await page.getByRole("button", { name: "Add block" }).click()
  const dialog = page.getByRole("dialog", { name: "Add block" })
  await dialog.getByLabel(/^Block name/).fill(name)
  await dialog.getByLabel(/^From/).fill(start)
  await dialog.getByLabel(/^To/).fill(end)
  await dialog.getByRole("button", { name: "Add block" }).click()
  await expect(dialog).toBeHidden()
}

async function expectAgenda(page: Page, long: string, brief: string) {
  const calendar = page.getByRole("region", { name: "Program calendar" })
  for (const [name, time] of [
    [long, "09:00–10:00"],
    [brief, "09:10–09:15"],
  ]) {
    const block = calendar.getByRole("button", { name: `Show details of ${name} · ${time}` })
    await block.scrollIntoViewIfNeeded()
    await expect(block.getByText(name, { exact: true })).toBeInViewport()
    await expect(block.getByText(time, { exact: true })).toBeInViewport()
  }
  expect(
    await calendar.evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBeLessThanOrEqual(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
}

test("organizer moves a short block into an overlap and the participant can read both at 360 px", async ({
  page,
}) => {
  const suffix = Date.now()
  const long = `Workshop ${suffix}`
  const brief = `Briefing ${suffix}`
  await signIn(page, "organizer", ORGANIZER)
  await openEventList(page)
  await page.getByRole("link", { name: camp }).click()
  await page
    .getByRole("navigation", { name: "Event sections" })
    .getByRole("link", { name: "Program", exact: true })
    .click()

  await page.setViewportSize({ width: 360, height: 800 })
  const day = page.getByRole("combobox", { name: "Day", exact: true })
  await expect(day).toHaveText(sunday)
  await addBlock(page, { name: brief, start: "09:00", end: "09:05" })
  await chooseDay(page, day, monday)
  await addBlock(page, { name: long, start: "09:00", end: "10:00" })
  await chooseDay(page, day, sunday)

  await page.getByRole("button", { name: `Show details of ${brief} · 09:00–09:05` }).click()
  const detail = page.getByRole("dialog", { name: brief })
  await expect(detail.getByText(sunday)).toBeVisible()
  await detail.getByRole("button", { name: "Edit" }).click()
  const edit = page.getByRole("dialog", { name: "Edit block" })
  await chooseDay(page, edit.getByRole("combobox", { name: /^Day/ }), monday)
  await edit.getByLabel(/^From/).fill("09:10")
  await edit.getByLabel(/^To/).fill("09:15")
  await expect(edit.getByRole("alert")).toContainText(long)
  await edit.getByRole("button", { name: "Save changes" }).click()
  await expect(edit).toBeHidden()
  await expect(page.getByRole("button", { name: new RegExp(brief) })).toHaveCount(0)
  await chooseDay(page, day, monday)
  await expectAgenda(page, long, brief)
  await expect(page.getByRole("button", { name: `Move block ${brief}` })).toHaveCount(0)

  await page.setViewportSize({ width: 1280, height: 800 })
  const move = page.getByRole("button", { name: `Move block ${brief}` })
  await move.press("Space")
  await move.press("ArrowDown")
  await expect(page.getByText("09:40–09:45", { exact: true })).toBeVisible()
  await move.press("Escape")
  await expect(page.getByText("09:40–09:45", { exact: true })).toHaveCount(0)

  await signOut(page, ORGANIZER)
  await expect(page).toHaveURL(/\/$/)
  await page.setViewportSize({ width: 360, height: 800 })
  await signIn(page, "participant", PARTICIPANT)
  await page.getByRole("link", { name: camp }).click()
  await page.getByRole("link", { name: "Program", exact: true }).click()
  await expect(day).toHaveText(sunday)
  await expect(page.getByRole("button", { name: new RegExp(brief) })).toHaveCount(0)
  await chooseDay(page, day, monday)
  await expectAgenda(page, long, brief)
  await page.getByRole("button", { name: `Show details of ${brief} · 09:10–09:15` }).click()
  await expect(detail.getByText(monday)).toBeVisible()
  await expect(detail.getByText("09:10–09:15", { exact: false })).toBeVisible()
  await expect(detail.getByRole("button", { name: "Edit" })).toHaveCount(0)
})
