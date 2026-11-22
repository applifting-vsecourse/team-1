import { expect, type Locator, type Page } from "@playwright/test"

export async function expectFitsViewport(page: Page, ...elements: Locator[]) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1)
  const width = await page.evaluate(() => document.documentElement.clientWidth)
  expect(width).toBe(page.viewportSize()?.width)

  for (const element of elements) {
    await expect(element).toBeVisible()
    const bounds = await element.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(-1)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1)
  }
}

export async function expectCompactHeading(heading: Locator) {
  await expect(heading).toBeVisible()
  const metrics = await heading.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    size: Number.parseFloat(getComputedStyle(element).fontSize),
    weight: Number.parseInt(getComputedStyle(element).fontWeight, 10),
  }))
  expect(metrics.size).toBeGreaterThanOrEqual(20)
  expect(metrics.weight).toBeGreaterThanOrEqual(600)
  expect(metrics.height).toBeLessThanOrEqual(40)
}
