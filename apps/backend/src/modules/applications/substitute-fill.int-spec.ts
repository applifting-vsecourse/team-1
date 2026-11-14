// US-31: a freed bed is filled by the first eligible substitute, by the system in the automatic
// evaluation mode, proposed to the organizer in the manual one; never confirmed twice.
import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import {
  allEmailsTo,
  api,
  connectTestPrisma,
  latestEmailTo,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

type List = {
  items: { applicationId: string; position: number; isProposed: boolean }[]
}

describe("filling a freed bed with a substitute (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let organizationId: string
  let counter = 0

  /** An event with one term and rooms of the given genders, `capacity` beds in each. */
  const createEvent = async (
    mode: "MANUAL" | "AUTOMATIC",
    rooms: { gender: "FEMALE" | "MALE" | null; capacity: number }[] = [
      { gender: "MALE", capacity: 1 },
    ],
  ): Promise<{ eventId: string; termId: string; roomIds: string[] }> => {
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: `US-31 ${mode} ${++counter}`,
        publicToken: `us-31-${randomUUID()}`,
        evaluationMode: mode,
        terms: {
          create: [
            {
              organizationId,
              number: 1,
              name: "T1",
              roomMode: rooms.some((room) => room.gender === null) ? "SHARED" : "GENDERED",
              rooms: {
                create: rooms.map((room, index) => ({
                  organizationId,
                  name: `R${index}`,
                  ...room,
                })),
              },
              startsOn: new Date("2027-07-01"),
              endsOn: new Date("2027-07-08"),
              priceCzk: 4900,
            },
          ],
        },
      },
      include: { terms: { include: { rooms: { orderBy: { name: "asc" } } } } },
    })
    return {
      eventId: event.id,
      termId: event.terms[0].id,
      roomIds: event.terms[0].rooms.map((room) => room.id),
    }
  }

  const addApplication = async (
    event: { eventId: string; termId: string },
    gender: "FEMALE" | "MALE",
    minute: number,
    status: "CONFIRMED" | "WAITLISTED",
  ): Promise<{ id: string; email: string }> => {
    const email = `us31-${++counter}-${randomUUID()}@example.com`
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId: event.eventId,
        accessToken: randomUUID(),
        firstName: "Test",
        lastName: `Applicant${counter}`,
        birthDate: new Date("2010-01-01"),
        gender,
        email,
        consentAt: new Date(),
        submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
        terms: { create: [{ organizationId, termId: event.termId, status, priceCzk: 4900 }] },
      },
    })
    return { id: application.id, email }
  }

  const statusOf = async (applicationId: string): Promise<string> =>
    (await prisma.applicationTerm.findFirstOrThrow({ where: { applicationId } })).status
  const cancel = (applicationId: string, termId: string): Promise<Response> =>
    fetch(api(`/organizer/applications/${applicationId}/terms/${termId}/status`), {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    })
  const list = async (event: { eventId: string; termId: string }): Promise<List> =>
    (await (
      await fetch(api(`/organizer/events/${event.eventId}/terms/${event.termId}/substitutes`), {
        headers: { Cookie: cookie },
      })
    ).json()) as List

  type Proposal = {
    termId: string
    group: "FEMALE" | "MALE" | "SHARED"
    freeBeds: number
    substitute: { applicationId: string }
  }
  const proposals = async (event: { eventId: string }): Promise<Proposal[]> =>
    (await (
      await fetch(api(`/organizer/events/${event.eventId}/substitute-proposals`), {
        headers: { Cookie: cookie },
      })
    ).json()) as Proposal[]
  const confirm = (
    event: { eventId: string; termId: string },
    applicationId: string,
  ): Promise<Response> =>
    fetch(
      api(
        `/organizer/events/${event.eventId}/terms/${event.termId}/substitutes/${applicationId}/confirm`,
      ),
      { method: "POST", headers: { Cookie: cookie } },
    )
  const extraBeds = (
    event: { eventId: string; termId: string; roomIds: string[] },
    count: number,
  ): Promise<Response> =>
    fetch(
      api(
        `/organizer/events/${event.eventId}/terms/${event.termId}/rooms/${event.roomIds[0]}/extra-beds`,
      ),
      {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ extraBeds: count }),
      },
    )

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
      include: { memberships: true },
    })
    organizationId = organizer.memberships[0].organizationId
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  describe("automatic evaluation mode", () => {
    it("confirms the first substitute of the same gender when a bed is freed, logs it and e-mails payment details", async () => {
      const event = await createEvent("AUTOMATIC")
      const confirmed = await addApplication(event, "MALE", 0, "CONFIRMED")
      await addApplication(event, "FEMALE", 1, "WAITLISTED")
      const first = await addApplication(event, "MALE", 2, "WAITLISTED")
      const second = await addApplication(event, "MALE", 3, "WAITLISTED")

      expect((await cancel(confirmed.id, event.termId)).status).toBe(204)

      expect(await statusOf(first.id)).toBe("CONFIRMED")
      expect(await statusOf(second.id)).toBe("WAITLISTED")
      const change = await prisma.applicationTermStatusChange.findFirstOrThrow({
        where: { applicationTerm: { applicationId: first.id } },
      })
      expect(change).toMatchObject({
        fromStatus: "WAITLISTED",
        toStatus: "CONFIRMED",
        changedById: null,
      })
      const email = await latestEmailTo(first.email)
      expect(email).toBeDefined()
    })

    it("leaves the bed free and the waitlist alone when nobody of its gender waits", async () => {
      const event = await createEvent("AUTOMATIC")
      const confirmed = await addApplication(event, "MALE", 0, "CONFIRMED")
      const woman = await addApplication(event, "FEMALE", 1, "WAITLISTED")

      await cancel(confirmed.id, event.termId)

      expect(await statusOf(woman.id)).toBe("WAITLISTED")
    })

    it("confirms from the one common queue of shared rooms, whatever the gender", async () => {
      const event = await createEvent("AUTOMATIC", [{ gender: null, capacity: 1 }])
      const confirmed = await addApplication(event, "MALE", 0, "CONFIRMED")
      const woman = await addApplication(event, "FEMALE", 1, "WAITLISTED")

      await cancel(confirmed.id, event.termId)

      expect(await statusOf(woman.id)).toBe("CONFIRMED")
    })

    it("fills a bed freed by the organizer's withdrawal of the participant", async () => {
      const event = await createEvent("AUTOMATIC")
      const confirmed = await addApplication(event, "MALE", 0, "CONFIRMED")
      const substitute = await addApplication(event, "MALE", 1, "WAITLISTED")

      const response = await fetch(api(`/organizer/applications/${confirmed.id}/terms/withdraw`), {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ termIds: [event.termId] }),
      })

      expect(response.status).toBe(200)
      expect(await statusOf(substitute.id)).toBe("CONFIRMED")
    })

    it("fills a bed freed by moving a confirmed application to the waitlist, but not with the one just moved", async () => {
      const event = await createEvent("AUTOMATIC")
      const moved = await addApplication(event, "MALE", 0, "CONFIRMED")
      const substitute = await addApplication(event, "MALE", 5, "WAITLISTED")

      const response = await fetch(
        api(`/organizer/applications/${moved.id}/terms/${event.termId}/status`),
        {
          method: "PATCH",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "WAITLISTED" }),
        },
      )

      expect(response.status).toBe(204)
      // The moved one is first in the queue by its receipt (D-073), yet it does not take back the
      // bed the organizer has just taken from it.
      expect(await statusOf(moved.id)).toBe("WAITLISTED")
      expect(await statusOf(substitute.id)).toBe("CONFIRMED")
    })

    it("never confirms anyone by itself when the capacity grows, and the bed is proposed to the organizer", async () => {
      const event = await createEvent("AUTOMATIC")
      await addApplication(event, "MALE", 0, "CONFIRMED")
      const first = await addApplication(event, "MALE", 1, "WAITLISTED")
      const second = await addApplication(event, "MALE", 2, "WAITLISTED")

      const response = await extraBeds(event, 1)

      expect(response.status).toBe(204)
      expect(await statusOf(first.id)).toBe("WAITLISTED")
      expect(await statusOf(second.id)).toBe("WAITLISTED")
      expect(await proposals(event)).toMatchObject([
        {
          termId: event.termId,
          group: "MALE",
          freeBeds: 1,
          substitute: { applicationId: first.id },
        },
      ])
      // One step: the organizer confirms the proposal, the first of the queue.
      expect((await confirm(event, first.id)).status).toBe(204)
      expect(await statusOf(first.id)).toBe("CONFIRMED")
      expect(await proposals(event)).toEqual([])
    })

    it("does not fill a new room or a changed room mode by itself either", async () => {
      const event = await createEvent("AUTOMATIC")
      await addApplication(event, "MALE", 0, "CONFIRMED")
      const waiting = await addApplication(event, "MALE", 1, "WAITLISTED")

      const added = await fetch(
        api(`/organizer/events/${event.eventId}/terms/${event.termId}/rooms`),
        {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "B", capacity: 2, gender: "MALE" }),
        },
      )

      expect(added.status).toBeLessThan(300)
      expect(await statusOf(waiting.id)).toBe("WAITLISTED")
      expect(await proposals(event)).toHaveLength(1)
    })

    it("fills only the bed that was freed when another bed was free already", async () => {
      // Two men's beds: one taken, one added by the organizer and left empty.
      const event = await createEvent("AUTOMATIC", [{ gender: "MALE", capacity: 2 }])
      const leaving = await addApplication(event, "MALE", 0, "CONFIRMED")
      const first = await addApplication(event, "MALE", 1, "WAITLISTED")
      const second = await addApplication(event, "MALE", 2, "WAITLISTED")

      await cancel(leaving.id, event.termId)

      expect(await statusOf(first.id)).toBe("CONFIRMED")
      expect(await statusOf(second.id)).toBe("WAITLISTED")
      // The bed that was free before stays free, proposed to the next in the queue.
      expect(await proposals(event)).toMatchObject([
        { freeBeds: 1, substitute: { applicationId: second.id } },
      ])
    })

    it("fills a freed bed only from its own bed group, not an earlier free bed of the other gender", async () => {
      const event = await createEvent("AUTOMATIC", [
        { gender: "MALE", capacity: 1 },
        { gender: "FEMALE", capacity: 1 },
      ])
      const man = await addApplication(event, "MALE", 0, "CONFIRMED")
      const woman = await addApplication(event, "FEMALE", 1, "WAITLISTED")
      const waitingMan = await addApplication(event, "MALE", 2, "WAITLISTED")

      await cancel(man.id, event.termId)

      expect(await statusOf(waitingMan.id)).toBe("CONFIRMED")
      // The women's bed was free before: it is for the organizer to fill.
      expect(await statusOf(woman.id)).toBe("WAITLISTED")
      expect(await proposals(event)).toMatchObject([
        { group: "FEMALE", substitute: { applicationId: woman.id } },
      ])
    })

    it("fills every bed freed at once, in order of receipt", async () => {
      const event = await createEvent("AUTOMATIC", [{ gender: "MALE", capacity: 2 }])
      const a = await addApplication(event, "MALE", 0, "CONFIRMED")
      const b = await addApplication(event, "MALE", 1, "CONFIRMED")
      const c = await addApplication(event, "MALE", 2, "WAITLISTED")
      const d = await addApplication(event, "MALE", 3, "WAITLISTED")
      const e = await addApplication(event, "MALE", 4, "WAITLISTED")

      await Promise.all([cancel(a.id, event.termId), cancel(b.id, event.termId)])

      expect(await Promise.all([c, d, e].map(({ id }) => statusOf(id)))).toEqual([
        "CONFIRMED",
        "CONFIRMED",
        "WAITLISTED",
      ])
      const confirmed = await prisma.applicationTerm.count({
        where: { termId: event.termId, status: "CONFIRMED" },
      })
      expect(confirmed).toBe(2)
    })

    it("never confirms two substitutes into one bed, however many requests race", async () => {
      const event = await createEvent("AUTOMATIC")
      const confirmed = await addApplication(event, "MALE", 0, "CONFIRMED")
      const waiting = await Promise.all(
        [1, 2, 3, 4].map((minute) => addApplication(event, "MALE", minute, "WAITLISTED")),
      )

      // The same bed is given up three times at once: only the first wins the transition.
      const responses = await Promise.all([
        cancel(confirmed.id, event.termId),
        cancel(confirmed.id, event.termId),
        cancel(confirmed.id, event.termId),
      ])

      expect(responses.filter((response) => response.status === 204)).toHaveLength(1)
      const statuses = await Promise.all(waiting.map(({ id }) => statusOf(id)))
      expect(statuses.filter((status) => status === "CONFIRMED")).toHaveLength(1)
      expect(statuses[0]).toBe("CONFIRMED")
      expect(
        await prisma.applicationTerm.count({
          where: { termId: event.termId, status: "CONFIRMED" },
        }),
      ).toBe(1)
      expect(allEmailsTo(waiting[0].email).length).toBeLessThanOrEqual(1)
    })

    it("never exceeds the capacity when the organizer confirms by hand while the system fills", async () => {
      const event = await createEvent("AUTOMATIC", [{ gender: "MALE", capacity: 2 }])
      const a = await addApplication(event, "MALE", 0, "CONFIRMED")
      const b = await addApplication(event, "MALE", 1, "CONFIRMED")
      const waiting = await Promise.all(
        [2, 3, 4].map((minute) => addApplication(event, "MALE", minute, "WAITLISTED")),
      )

      await Promise.all([
        cancel(a.id, event.termId),
        cancel(b.id, event.termId),
        confirm(event, waiting[2].id),
      ])

      expect(
        await prisma.applicationTerm.count({
          where: { termId: event.termId, status: "CONFIRMED" },
        }),
      ).toBe(2)
    })
  })

  describe("manual evaluation mode", () => {
    it("confirms nobody by itself and proposes the first substitute of each gender with a free bed", async () => {
      const event = await createEvent("MANUAL", [
        { gender: "MALE", capacity: 1 },
        { gender: "FEMALE", capacity: 1 },
      ])
      const man = await addApplication(event, "MALE", 0, "CONFIRMED")
      await addApplication(event, "FEMALE", 1, "CONFIRMED")
      const first = await addApplication(event, "MALE", 2, "WAITLISTED")
      const second = await addApplication(event, "MALE", 3, "WAITLISTED")
      const woman = await addApplication(event, "FEMALE", 4, "WAITLISTED")

      await cancel(man.id, event.termId)

      expect(await statusOf(first.id)).toBe("WAITLISTED")
      const body = await list(event)
      expect(body.items.map((item) => [item.applicationId, item.isProposed])).toEqual([
        [first.id, true],
        [second.id, false],
      ])
      expect(body.items.some((item) => item.applicationId === woman.id)).toBe(false)
    })

    it("confirms the proposal in one step and the same bed cannot be taken twice", async () => {
      const event = await createEvent("MANUAL")
      const confirmed = await addApplication(event, "MALE", 0, "CONFIRMED")
      const first = await addApplication(event, "MALE", 1, "WAITLISTED")
      const second = await addApplication(event, "MALE", 2, "WAITLISTED")
      await cancel(confirmed.id, event.termId)
      const [proposed] = (await list(event)).items.filter((item) => item.isProposed)
      expect(proposed.applicationId).toBe(first.id)

      const confirm = (applicationId: string): Promise<Response> =>
        fetch(
          api(
            `/organizer/events/${event.eventId}/terms/${event.termId}/substitutes/${applicationId}/confirm`,
          ),
          { method: "POST", headers: { Cookie: cookie } },
        )
      const responses = await Promise.all([confirm(first.id), confirm(second.id)])

      expect(responses.map((response) => response.status).sort()).toEqual([204, 409])
      const statuses = [await statusOf(first.id), await statusOf(second.id)]
      expect(statuses.filter((status) => status === "CONFIRMED")).toHaveLength(1)
      expect((await list(event)).items).toEqual([])
    })

    it("proposes the bed a bigger capacity made, and confirms nobody by itself", async () => {
      const event = await createEvent("MANUAL")
      await addApplication(event, "MALE", 0, "CONFIRMED")
      const first = await addApplication(event, "MALE", 1, "WAITLISTED")
      expect(await proposals(event)).toEqual([])

      expect((await extraBeds(event, 1)).status).toBe(204)

      expect(await statusOf(first.id)).toBe("WAITLISTED")
      expect(await proposals(event)).toMatchObject([
        { group: "MALE", substitute: { applicationId: first.id } },
      ])
    })
  })

  describe("the organizer's notice of free beds", () => {
    it("is for organizers of the event only", async () => {
      const event = await createEvent("MANUAL")
      const url = api(`/organizer/events/${event.eventId}/substitute-proposals`)
      expect((await fetch(url)).status).toBe(401)
      const foreign = await signIn("organizator2@example.com", "password2")
      expect((await fetch(url, { headers: { Cookie: foreign } })).status).toBe(403)
    })

    it("lists a proposal per term and bed group, leaves out cancelled terms", async () => {
      const event = await createEvent("MANUAL", [
        { gender: "MALE", capacity: 1 },
        { gender: "FEMALE", capacity: 1 },
      ])
      const man = await addApplication(event, "MALE", 0, "WAITLISTED")
      const woman = await addApplication(event, "FEMALE", 1, "WAITLISTED")

      expect((await proposals(event)).map((row) => row.substitute.applicationId).sort()).toEqual(
        [man.id, woman.id].sort(),
      )

      await prisma.term.update({ where: { id: event.termId }, data: { cancelledAt: new Date() } })
      expect(await proposals(event)).toEqual([])
    })
  })
})
