import { devices, expect, test } from "@playwright/test"
import { chooseEvaluationMode, createEventWithTerm } from "./support/event-setup"
import {
  assertSwipeAndCancelDoNotAssign,
  dragToRoom,
  FIRST_ROOM,
  FULL_ROOM,
  LAST_FREE_ROOM,
  openAssignments,
  openRoomAction,
  roomCard,
  roomChoice,
  test as assignmentTest,
  unassignedDragHandle,
} from "./support/room-assignment"

// US-12 event, US-13 terms, US-16 term price, US-14 rooms. The application link works only once
// the event has a term with a price and a room.
test.describe("Event setup", () => {
  test("organizer creates an event, adds a term with a price and sees that a room is missing", async ({
    page,
  }) => {
    await createEventWithTerm(page, `E2E akce ${Date.now()}`)

    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Overview" })
      .click()
    await expect(page.getByRole("heading", { name: "Application setup" })).toBeVisible()
    await expect(page.getByText("1/3 done")).toBeVisible()
    await expect(page.getByRole("link", { name: "Set capacity" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Copy/ })).toHaveCount(0)
  })

  test("organizer adds a room and copies the application link", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await createEventWithTerm(page, `E2E akce ${Date.now()}`)

    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Overview" })
      .click()
    await page.getByRole("link", { name: "Set capacity" }).click()
    await page.getByRole("button", { name: "Add room" }).first().click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Room name").fill("Pokoj E2E")
    await dialog.getByLabel("Capacity").fill("5")
    await dialog.getByRole("button", { name: "Add room" }).click()
    await expect(page.getByRole("cell", { name: "Pokoj E2E", exact: true })).toBeVisible()

    // A room alone does not open the link: the evaluation mode has to be chosen too (US-560).
    await chooseEvaluationMode(page, "Automatic")
    await page
      .getByRole("navigation", { name: "Event sections" })
      .getByRole("link", { name: "Overview" })
      .click()
    const link = await page.getByRole("link", { name: "Open page" }).getAttribute("href")
    await expect(page.getByRole("button", { name: /Copy/ })).toHaveCount(1)
    await page.getByRole("button", { name: "Copy link", exact: true }).click()
    await expect(page.getByText("Link copied to the clipboard")).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link)
  })
})

assignmentTest.describe("Room assignments on a touch phone", () => {
  const { deviceScaleFactor, hasTouch, isMobile, userAgent } = devices["Pixel 7"]
  assignmentTest.use({
    deviceScaleFactor,
    hasTouch,
    isMobile,
    userAgent,
    viewport: { width: 360, height: 800 },
  })

  assignmentTest(
    "organizer assigns, moves and removes a participant at 360 px",
    async ({ page, assignment }) => {
      const { person } = assignment
      await openAssignments(page, assignment)
      await assertSwipeAndCancelDoNotAssign(page, person)

      const assign = page.getByRole("button", { name: "Assign " + person + " to a room" })
      const actions = page.getByRole("button", { name: "Actions for " + person })
      const dialog = page.getByRole("dialog")
      expect(await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth])).toEqual(
        [360, 360],
      )
      await assign.tap()
      expect(await dialog.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(328)
      await roomChoice(page, LAST_FREE_ROOM).tap()
      await expect(dialog.getByRole("button", { name: "Assign", exact: true })).toBeInViewport()
      await dialog.getByRole("button", { name: "Assign", exact: true }).tap()
      const originalRoom = roomCard(page, LAST_FREE_ROOM)
      await originalRoom.getByRole("button", { name: "Participants", exact: true }).tap()
      await expect(
        originalRoom.getByRole("button", { name: "Actions for " + person }),
      ).toBeVisible()

      await openRoomAction(page, actions, "Move to another room…")
      await expect(roomChoice(page, LAST_FREE_ROOM)).toBeDisabled()
      await roomChoice(page, FULL_ROOM).tap()
      await dialog.getByRole("button", { name: "Move", exact: true }).tap()
      const fullDialog = page.getByRole("dialog", { name: FULL_ROOM + " is full" })
      await expect(fullDialog.getByRole("button", { name: "Assign as an extra bed" })).toBeVisible()
      await fullDialog.getByRole("button", { name: "Cancel" }).tap()
      await expect(
        originalRoom.getByRole("button", { name: "Actions for " + person }),
      ).toBeVisible()

      await openRoomAction(page, actions, "Move to another room…")
      await roomChoice(page, FIRST_ROOM).tap()
      await dialog.getByRole("button", { name: "Move", exact: true }).tap()
      const destinationRoom = roomCard(page, FIRST_ROOM)
      await destinationRoom.getByRole("button", { name: "Participants", exact: true }).tap()
      await expect(
        destinationRoom.getByRole("button", { name: "Actions for " + person }),
      ).toBeVisible()
      await openRoomAction(page, actions, "Remove from room")
      await expect(assign).toBeVisible()
      await expect(actions).toHaveCount(0)
    },
  )
})

assignmentTest(
  "organizer drags with a mouse and gets the same extra-bed confirmation",
  async ({ page, assignment }) => {
    const { person } = assignment
    await openAssignments(page, assignment)
    await dragToRoom(page, unassignedDragHandle(page, person), LAST_FREE_ROOM)
    const originalRoom = page.getByRole("row").filter({
      has: page.getByRole("cell", { name: LAST_FREE_ROOM, exact: true }),
    })
    await originalRoom.getByRole("button", { name: "Participants", exact: true }).press("Enter")
    const actions = originalRoom.getByRole("button", { name: "Actions for " + person })
    await expect(actions).toBeVisible()
    await dragToRoom(page, actions, FULL_ROOM, "E2E Room 1")
    const fullDialog = page.getByRole("dialog", { name: FULL_ROOM + " is full" })
    await expect(fullDialog.getByRole("button", { name: "Assign as an extra bed" })).toBeVisible()
    await fullDialog.getByRole("button", { name: "Cancel" }).click()
    await expect(actions).toBeVisible()
  },
)
