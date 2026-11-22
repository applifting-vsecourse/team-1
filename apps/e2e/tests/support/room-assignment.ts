import { randomUUID } from "node:crypto"
import { expect, test as base, type Locator, type Page } from "@playwright/test"
import pg from "pg"
import { e2eDatabaseUrl } from "../../scripts/database-url.mjs"
import { ORGANIZER, SUMMER_CAMP_LINK } from "./accounts"
import { openEventList, signIn } from "./auth"

type Assignment = { eventId: string; termId: string; person: string }
export const FIRST_ROOM = "E2E Room 01"
export const LAST_FREE_ROOM = "E2E Room 13"
export const FULL_ROOM = "E2E Room 14"

export const test = base.extend<{ assignment: Assignment }>({
  assignment: async ({}, use) => {
    const client = new pg.Client({ connectionString: e2eDatabaseUrl() })
    const termId = randomUUID()
    const personId = randomUUID()
    const occupantId = randomUUID()
    const fullRoomId = termId + "-14"
    const person = "Alex Assignment"
    const token = SUMMER_CAMP_LINK.split("/").at(-1)
    await client.connect()
    try {
      const { rows } = await client.query<{ id: string; organizationId: string }>(
        'SELECT id, "organizationId" FROM "event" WHERE "publicToken" = $1',
        [token],
      )
      const { id: eventId, organizationId } = rows[0]
      await client.query(
        `INSERT INTO "term" (id, "organizationId", "eventId", number, name, "startsOn", "endsOn", "priceCzk")
         SELECT $1, $2, $3, COALESCE(MAX(number), 0) + 1, 'E2E accommodation', '2029-01-01', '2029-01-07', 1000
         FROM "term" WHERE "eventId" = $3`,
        [termId, organizationId, eventId],
      )
      await client.query(
        `INSERT INTO "room" (id, "organizationId", "termId", name, capacity, gender)
         SELECT $1 || '-' || n, $2, $1, 'E2E Room ' || lpad(n::text, 2, '0'), 1, 'FEMALE'
         FROM generate_series(1, 14) AS n`,
        [termId, organizationId],
      )
      await client.query(
        `INSERT INTO "application" (id, "organizationId", "eventId", "accessToken", "firstName", "lastName", "birthDate", gender, email, "consentAt")
         VALUES ($1, $3, $4, $1, 'Alex', 'Assignment', '2010-01-01', 'FEMALE', $1 || '@example.com', now()),
                ($2, $3, $4, $2, 'Robin', 'Occupant', '2010-01-01', 'FEMALE', $2 || '@example.com', now())`,
        [personId, occupantId, organizationId, eventId],
      )
      await client.query(
        `INSERT INTO "application_term" (id, "organizationId", "applicationId", "termId", status, "priceCzk")
         VALUES ($1, $3, $1, $4, 'CONFIRMED', 1000), ($2, $3, $2, $4, 'CONFIRMED', 1000)`,
        [personId, occupantId, organizationId, termId],
      )
      await client.query(
        `INSERT INTO "application_term" (id, "organizationId", "applicationId", "termId", status, "priceCzk")
         SELECT $1 || '-other', $2, $1, id, 'CONFIRMED', "priceCzk"
         FROM "term" WHERE "eventId" = $3 AND id <> $4 ORDER BY number LIMIT 1`,
        [personId, organizationId, eventId, termId],
      )
      await client.query(
        `INSERT INTO "room_assignment" (id, "organizationId", "applicationTermId", "roomId")
         VALUES ($1, $2, $1, $3)`,
        [occupantId, organizationId, fullRoomId],
      )
      await use({ eventId, termId, person })
    } finally {
      try {
        await client.query('DELETE FROM "application" WHERE id IN ($1, $2)', [personId, occupantId])
        await client.query('DELETE FROM "term" WHERE id = $1', [termId])
      } finally {
        await client.end()
      }
    }
  },
})

export async function openAssignments(page: Page, { eventId, termId }: Assignment) {
  await signIn(page, "organizer", ORGANIZER)
  await openEventList(page)
  await page.goto("/organizer/events/" + eventId + "/rooms?termId=" + termId)
  await expect(page.getByRole("heading", { name: "Rooms of the selected term" })).toBeVisible()
}

export function unassignedDragHandle(page: Page, person: string) {
  return page.getByRole("button").filter({ has: page.getByText(person, { exact: true }) })
}

export function roomCard(page: Page, room: string) {
  return page.getByRole("listitem").filter({ has: page.getByText(room, { exact: true }) })
}

export function roomChoice(page: Page, room: string) {
  return page.getByRole("dialog").getByRole("radio", { name: new RegExp(room) })
}

export async function openRoomAction(page: Page, participant: Locator, name: string) {
  await participant.tap()
  await page.getByRole("dialog").getByRole("button", { name }).tap()
}

function activeDrag(page: Page) {
  return page.getByRole("status").filter({
    hasText:
      /Picked up draggable item|was moved over droppable area|is no longer over a droppable area/,
  })
}

export async function assertSwipeAndCancelDoNotAssign(page: Page, person: string) {
  const name = unassignedDragHandle(page, person)
  const cdp = await page.context().newCDPSession(page)
  await name.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }))
  const origin = await name.boundingBox()
  if (!origin) throw new Error("Participant row is outside the viewport")
  const x = origin.x + origin.width / 2
  const y = origin.y + origin.height / 2

  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] })
  await expect(activeDrag(page)).toHaveCount(1)
  await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] })
  await expect(page.getByRole("status").filter({ hasText: "Dragging was cancelled." })).toHaveCount(
    1,
  )

  const scrollBefore = await page.evaluate(() => window.scrollY)
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] })
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: y - 100 }],
  })
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore)
  await expect(activeDrag(page)).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Assign " + person + " to a room" })).toBeVisible()
  await cdp.detach()
}

export async function dragToRoom(page: Page, source: Locator, room: string, search = room) {
  await page.getByRole("searchbox", { name: "Search rooms" }).fill(search)
  const target = page.getByRole("cell", { name: room, exact: true })
  await source.scrollIntoViewIfNeeded()
  await target.scrollIntoViewIfNeeded()
  const start = await source.boundingBox()
  const end = await target.boundingBox()
  if (!start || !end) throw new Error("Drag source or target is outside the viewport")

  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(start.x + start.width / 2 + 12, start.y + start.height / 2)
  await expect(activeDrag(page)).toHaveCount(1)
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 10 })
  await page.mouse.up()
}
