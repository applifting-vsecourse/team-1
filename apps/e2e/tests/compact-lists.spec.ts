import { expect, test, type Locator, type Page } from "@playwright/test"
import { ORGANIZER, PARTICIPANT } from "./support/accounts"
import { openEventList, signIn } from "./support/auth"
import { expectCompactHeading, expectFitsViewport } from "./support/layout"

const event = "Letní kemp 2027"
const participant = "Jana Nováková"
const firstTermDates = /4.*10 Jul 2027/
const backend = `http://localhost:${process.env.E2E_BACKEND_PORT ?? 4190}/api`

async function openEvent(page: Page) {
  await signIn(page, "organizer", ORGANIZER)
  await openEventList(page)
  const eventLink = page.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ })
  await expectFitsViewport(page, eventLink)
  const eventHeight = (await eventLink.boundingBox())!.height
  const href = await eventLink.getAttribute("href")
  expect(href).toMatch(/^\/organizer\/events\/[^/]+$/)
  await eventLink.click()
  await expect(page.getByRole("heading", { name: event, level: 1 })).toBeVisible()
  return { eventPath: href!, eventId: href!.split("/").at(-1)!, eventHeight }
}

async function disclose(button: Locator, touch: boolean) {
  await expect(button).toHaveAttribute("aria-expanded", "false")
  const bounds = await button.boundingBox()
  expect(bounds?.height).toBeGreaterThanOrEqual(44)
  if (touch) await button.tap()
  else await button.press("Enter")
  await expect(button).toHaveAttribute("aria-expanded", "true")
}

type RoomParticipant = { applicationTermId: string; firstName: string; lastName: string }
type Room = { id: string; name: string; beds: number; participants: RoomParticipant[] }

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 360, height: 800 },
]) {
  const touch = viewport.width === 360
  test.describe(`Compact lists at ${viewport.width} px`, () => {
    test.use({ viewport, hasTouch: touch, isMobile: touch })

    test("shows the event and application status before opening details", async ({ page }) => {
      const { eventPath, eventHeight } = await openEvent(page)
      const eventTitle = page.getByRole("heading", { name: event, level: 1 })
      const occupancy = page.getByRole("heading", { name: "Occupancy by term" })
      const term = page.getByRole("heading", { name: firstTermDates })
      await expectFitsViewport(page, eventTitle, occupancy, term)
      await expectCompactHeading(eventTitle)
      await expect(page.getByText("Applications open", { exact: true })).toBeVisible()
      await expect(page.getByRole("progressbar", { name: "Occupied" }).first()).toBeVisible()

      await page.goto(`${eventPath}/applications?q=${encodeURIComponent(participant)}`)
      const trigger = page.getByRole("button", { name: participant, exact: true })
      const row = page.getByRole(touch ? "listitem" : "row").filter({ has: trigger })
      await expectFitsViewport(page, row, trigger)
      await expect(row.getByText("Confirmed", { exact: true }).first()).toBeVisible()
      await expect(row.getByText(firstTermDates)).toBeVisible()
      await expect(row.getByText(PARTICIPANT.email)).toBeHidden()
      const action = row.getByRole("link", { name: /Record payment|Application detail/ })
      const received = row.getByText(/^Received ·/)
      await expect(received).toBeHidden()
      await expectFitsViewport(page, action)
      await disclose(trigger, touch)
      const email = row.getByText(PARTICIPANT.email)
      await expectFitsViewport(page, received, email, action)
      await email.click()
      await expect(trigger).toHaveAttribute("aria-expanded", "true")
      await action.click()

      const title = page.getByRole("heading", { name: participant })
      const statuses = page.getByRole("heading", { name: "Status by term" })
      await expectFitsViewport(page, title, statuses)
      await expectCompactHeading(title)
      await expect(page.getByRole("heading", { name: /1\. týden · Confirmed/ })).toBeVisible()
      await expect(page.getByRole("heading", { name: firstTermDates }).first()).toBeVisible()
      expect(eventHeight).toBeLessThanOrEqual(touch ? 180 : 100)
    })

    test("keeps occupancy and room actions available when participants are collapsed", async ({
      page,
    }) => {
      const { eventId, eventPath } = await openEvent(page)
      const response = await page.request.get(`${backend}/organizer/events/${eventId}/occupancy`)
      await expect(response).toBeOK()
      const { terms } = (await response.json()) as { terms: { id: string }[] }
      const assignments = `${backend}/organizer/events/${eventId}/terms/${terms[0]!.id}/room-assignments`
      const assignmentResponse = await page.request.get(assignments)
      await expect(assignmentResponse).toBeOK()
      const { rooms, unassigned } = (await assignmentResponse.json()) as {
        rooms: Room[]
        unassigned: RoomParticipant[]
      }
      const isJana = ({ firstName, lastName }: RoomParticipant) =>
        `${firstName} ${lastName}` === participant
      const assigned = rooms.find((room) => room.participants.some(isJana))
      const room = assigned ?? rooms.find((room) => room.name === "1")!
      const count = room.participants.length + (assigned ? 0 : 1)
      if (!assigned) {
        const jana = unassigned.find(isJana)!
        await expect(
          await page.request.put(`${assignments}/${jana.applicationTermId}`, {
            data: { roomId: room.id, alsoTermIds: [] },
          }),
        ).toBeOK()
      }

      await page.goto(`${eventPath}/rooms`)
      const edit = page.getByRole("button", { name: `Edit room ${room.name}`, exact: true })
      const row = page.getByRole(touch ? "listitem" : "row").filter({ has: edit })
      const trigger = row.getByRole("button", { name: /^Participants · / })
      const actions = row.getByRole("button", { name: `Actions for ${participant}` })
      await expectFitsViewport(page, row, edit, trigger)
      if (touch) {
        const mode = page.getByRole("combobox", { name: "Room mode" })
        const add = page.getByRole("button", { name: "Add room", exact: true })
        const modeBounds = (await mode.boundingBox())!
        const addBounds = (await add.boundingBox())!
        expect(modeBounds.y).toBeLessThan(addBounds.y)
        expect(addBounds.y).toBeLessThan((await edit.boundingBox())!.y)
      }
      if (count > 1) await expect(trigger).toContainText(`+${count - 1}`)
      await expect(row.getByText(`${count} / ${room.beds}`, { exact: true })).toBeVisible()
      await expect(actions).toBeHidden()
      await disclose(trigger, touch)
      await expectFitsViewport(page, actions, edit)
      await actions.click()
      const roomActions = touch ? page.getByRole("dialog", { name: participant }) : page
      const actionRole = touch ? "button" : "menuitem"
      await expect(
        roomActions.getByRole(actionRole, { name: "Move to another room…" }),
      ).toBeVisible()
      await expect(roomActions.getByRole(actionRole, { name: "Remove from room" })).toBeVisible()

      await page.goto(`${eventPath}/rooms?view=overview`)
      const card = page.getByRole("listitem").filter({
        has: page.getByRole("heading", { name: room.name, exact: true, level: 3 }),
      })
      const beds = card.getByRole("button", { name: `Beds · ${room.name} ·` })
      const person = card.locator("ul").getByText(participant, { exact: true })
      await expectFitsViewport(page, beds)
      if (count > 1) await expect(beds).toContainText(`+${count - 1}`)
      else await expect(beds).toHaveText(participant)
      await expect(person).toBeHidden()
      await expect(card.getByText(`${count} / ${room.beds}`, { exact: true })).toBeVisible()
      await disclose(beds, touch)
      if (count < room.beds)
        await expect(card.locator("ul").getByText("Free bed").first()).toBeVisible()
      await expectFitsViewport(
        page,
        person,
        card.getByRole("button", { name: `Actions for ${participant}` }),
      )
      await beds.click()
      await expect(person).toBeHidden()
      await page.emulateMedia({ media: "print" })
      await expect(person).toBeVisible()
      await expect(beds).toBeHidden()
    })

    test("opens transport details and participant contact on demand", async ({ page, browser }) => {
      const { eventId, eventPath } = await openEvent(page)
      const endpoint = `${backend}/organizer/events/${eventId}/transport`
      const transportList = await page.request.get(endpoint)
      await expect(transportList).toBeOK()
      const { terms } = (await transportList.json()) as { terms: { termId: string }[] }
      const termId = terms[0]!.termId
      const name = `Bus E2E ${Date.now()}`
      const departurePlace = "Praha, Černý Most"
      await expect(
        await page.request.post(endpoint, {
          data: {
            termId,
            kind: "SCHEDULED",
            name,
            departureAt: "2027-07-04T06:00:00.000Z",
            departurePlace,
          },
        }),
      ).toBeOK()

      await page.goto(`${eventPath}/transport`)
      const trigger = page.getByRole("button", { name: new RegExp(`^${name}`) })
      const row = page.getByRole("listitem").filter({ has: trigger })
      const showParticipants = row.getByRole("link", {
        name: `Show participants of transport ${name}`,
      })
      const edit = row.getByRole("button", { name: `Edit transport ${name}` })
      await expectFitsViewport(page, row, trigger, edit)
      await expect(trigger).toContainText(/08:00/)
      await expect(row.getByText(departurePlace)).toBeHidden()
      await disclose(trigger, touch)
      await expectFitsViewport(page, row.getByText(departurePlace), showParticipants, edit)

      const href = await showParticipants.getAttribute("href")
      expect(href).toMatch(/\/transport\/[^/]+\/participants$/)
      const transportId = href!.split("/").at(-2)!
      const baseURL = new URL(page.url()).origin
      const guest = await browser.newContext({ baseURL, locale: "en-GB" })
      try {
        const guestPage = await guest.newPage()
        await signIn(guestPage, "participant", PARTICIPANT)
        await expect(guestPage).toHaveURL(/\/participant$/)
        const applicationLink = guestPage.getByRole("link", { name: /Letní kemp 2027(?! – demo)/ })
        const applicationPath = await applicationLink.getAttribute("href")
        const applicationId = applicationPath!.split("/").at(-1)!
        await expect(
          await guestPage.request.put(
            `${backend}/participant/applications/${applicationId}/transport`,
            {
              data: { termId, transportId },
            },
          ),
        ).toBeOK()
      } finally {
        await guest.close()
      }

      await page.reload()
      await expect(trigger).toContainText("1 participant")
      await disclose(trigger, touch)
      await showParticipants.click()
      const participantTrigger = page.getByRole("button", {
        name: new RegExp(`^${participant}.*${firstTermDates.source}`),
      })
      await expectFitsViewport(page, participantTrigger)
      await expect(page.getByText(PARTICIPANT.email)).toBeHidden()
      await disclose(participantTrigger, touch)
      await expectFitsViewport(page, page.getByText(PARTICIPANT.email))
      const collapse = page.getByRole("button", { name: "Collapse all contacts" })
      await expectFitsViewport(page, collapse)
      if (touch) await collapse.tap()
      else await collapse.press("Enter")
      await expect(page.getByText(PARTICIPANT.email)).toBeHidden()
      const expand = page.getByRole("button", { name: "Expand all contacts" })
      await expectFitsViewport(page, expand)
      if (touch) await expand.tap()
      else await expand.press("Enter")
      await expectFitsViewport(page, page.getByText(PARTICIPANT.email))
    })
  })
}
