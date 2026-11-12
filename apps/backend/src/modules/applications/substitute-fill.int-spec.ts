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

    it("fills a bed that a bigger room (extra bed) opens, one substitute per bed", async () => {
      const event = await createEvent("AUTOMATIC")
      await addApplication(event, "MALE", 0, "CONFIRMED")
      const first = await addApplication(event, "MALE", 1, "WAITLISTED")
      const second = await addApplication(event, "MALE", 2, "WAITLISTED")

      const response = await fetch(
        api(
          `/organizer/events/${event.eventId}/terms/${event.termId}/rooms/${event.roomIds[0]}/extra-beds`,
        ),
        {
          method: "PATCH",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ extraBeds: 1 }),
        },
      )

      expect(response.status).toBe(204)
      expect(await statusOf(first.id)).toBe("CONFIRMED")
      expect(await statusOf(second.id)).toBe("WAITLISTED")
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

    it("never confirms two substitutes into one bed, however many freeing events race", async () => {
      const event = await createEvent("AUTOMATIC")
      const confirmed = await addApplication(event, "MALE", 0, "CONFIRMED")
      const waiting = await Promise.all(
        [1, 2, 3, 4].map((minute) => addApplication(event, "MALE", minute, "WAITLISTED")),
      )

      // The cancellation fills the bed, and a parallel save of the room asks to fill it as well.
      await Promise.all([
        cancel(confirmed.id, event.termId),
        fetch(
          api(
            `/organizer/events/${event.eventId}/terms/${event.termId}/rooms/${event.roomIds[0]}/extra-beds`,
          ),
          {
            method: "PATCH",
            headers: { Cookie: cookie, "Content-Type": "application/json" },
            body: JSON.stringify({ extraBeds: 0 }),
          },
        ),
        cancel(confirmed.id, event.termId),
      ])

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
  })
})
