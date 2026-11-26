// #786–#790 (D-191, D-192): an organizer writes for the participant what the participant can write,
// with the same rules, and the edits of transport and meals end with the term.
import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("organizer writes for the participant (integration)", () => {
  let prisma: PrismaService
  let organizer: string
  let foreignOrganizer: string
  let participant: string
  let organizationId: string
  let eventId: string
  let futureTermId: string
  let pastTermId: string
  let busId: string
  let ownId: string
  let pastBusId: string
  let counter = 0

  const call = (method: string, path: string, cookie: string, body?: unknown) =>
    fetch(api(path), {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

  const makeApplication = async (
    terms: { termId: string; status?: "CONFIRMED" | "WAITLISTED" }[],
    individualAccommodation = false,
  ): Promise<string> => {
    counter += 1
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        userId: user.id,
        accessToken: randomUUID(),
        firstName: "Test",
        lastName: `Za účastníka ${counter}`,
        birthDate: new Date("2010-01-01"),
        gender: "FEMALE",
        email: `d191-${counter}@example.com`,
        consentAt: new Date(),
        individualAccommodation,
        terms: {
          create: terms.map(({ termId, status }) => ({
            organizationId,
            termId,
            status: status ?? "CONFIRMED",
            priceCzk: 1000,
          })),
        },
      },
    })
    return application.id
  }

  const history = async (applicationId: string) => {
    const response = await call(
      "GET",
      `/organizer/applications/${applicationId}/history`,
      organizer,
    )
    return (await response.json()) as {
      kind: string
      author: string | null
      field?: string
      from?: string | null
      to?: string | null
    }[]
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    organizer = await signIn("organizator@example.com", "password1")
    foreignOrganizer = await signIn("organizator2@example.com", "password2")
    participant = await signIn("ucastnik@example.com", "password4")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    organizationId = member.organizationId
    eventId = (
      await prisma.event.create({
        data: { organizationId, name: "D-191", publicToken: `d191-${randomUUID()}` },
      })
    ).id
    const term = (number: number, startsOn: string, endsOn: string) =>
      prisma.term.create({
        data: {
          organizationId,
          eventId,
          number,
          startsOn: new Date(startsOn),
          endsOn: new Date(endsOn),
          priceCzk: 1000,
        },
      })
    futureTermId = (await term(1, "2037-07-12", "2037-07-19")).id
    pastTermId = (await term(2, "2020-07-12", "2020-07-19")).id
    const transport = async (termId: string, kind: "SCHEDULED" | "OWN", name: string) =>
      (
        await prisma.transport.create({
          data: {
            organizationId,
            termId,
            kind,
            name,
            departurePlace: kind === "OWN" ? null : "Praha",
            departureAt: kind === "OWN" ? null : new Date("2037-07-12T06:00:00Z"),
          },
        })
      ).id
    busId = await transport(futureTermId, "SCHEDULED", "Autobus")
    ownId = await transport(futureTermId, "OWN", "")
    pastBusId = await transport(pastTermId, "SCHEDULED", "Starý autobus")
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe("#786 transport", () => {
    const choose = (applicationId: string, cookie: string, termId: string, transportId: string) =>
      call(
        "PUT",
        `/${cookie === participant ? "participant" : "organizer"}/applications/${applicationId}/transport`,
        cookie,
        { termId, transportId },
      )
    const chosen = async (applicationId: string) => {
      const response = await call(
        "GET",
        `/participant/applications/${applicationId}/transport`,
        participant,
      )
      const body = (await response.json()) as {
        terms: { termId: string; selectedTransportId: string | null; isEditable: boolean }[]
      }
      return body.terms
    }

    it("chooses and changes the transport, the participant sees it, others stay", async () => {
      const applicationId = await makeApplication([{ termId: futureTermId }])
      const other = await makeApplication([{ termId: futureTermId }])
      expect((await choose(applicationId, organizer, futureTermId, busId)).status).toBe(204)
      expect((await chosen(applicationId))[0]).toMatchObject({
        selectedTransportId: busId,
        isEditable: true,
      })
      expect((await choose(applicationId, organizer, futureTermId, ownId)).status).toBe(204)
      expect((await chosen(applicationId))[0].selectedTransportId).toBe(ownId)
      expect((await chosen(other))[0].selectedTransportId).toBeNull()
      const author = await prisma.user.findUniqueOrThrow({
        where: { email: "organizator@example.com" },
      })
      const entries = (await history(applicationId)).filter(({ kind }) => kind === "LOGISTICS")
      expect(entries).toHaveLength(2)
      expect(entries[0]).toMatchObject({ field: "transport", author: author.name ?? author.email })
    })

    it("refuses a transport of another term, a foreign organization and a participant route for it", async () => {
      const applicationId = await makeApplication([{ termId: futureTermId }])
      expect((await choose(applicationId, organizer, futureTermId, pastBusId)).status).toBe(403)
      expect((await choose(applicationId, foreignOrganizer, futureTermId, busId)).status).toBe(403)
      expect((await choose(applicationId, participant, futureTermId, busId)).status).toBe(204)
      // The participant's own choice is not written to the history.
      expect((await history(applicationId)).some(({ kind }) => kind === "LOGISTICS")).toBe(false)
    })

    it("#790: nobody chooses after the term is over", async () => {
      const applicationId = await makeApplication([{ termId: pastTermId }])
      for (const cookie of [organizer, participant]) {
        const response = await choose(applicationId, cookie, pastTermId, pastBusId)
        expect(response.status).toBe(409)
        expect(await response.json()).toMatchObject({ code: "TRANSPORT_EDIT_CLOSED" })
      }
      expect((await chosen(applicationId))[0].isEditable).toBe(false)
    })
  })

  describe("#787 room wishes", () => {
    const wishes = (applicationId: string, cookie: string, termId: string, body: unknown) =>
      call(
        "PUT",
        `/organizer/applications/${applicationId}/terms/${termId}/room-wishes`,
        cookie,
        body,
      )
    const wishesOf = async (applicationId: string) => {
      const response = await call("GET", `/participant/applications/${applicationId}`, participant)
      const body = (await response.json()) as {
        terms: { termId: string; roomWishes?: string[]; noRoomWishes?: boolean }[]
      }
      return body.terms.find((term) => term.termId === futureTermId)
    }

    it("writes, changes and deletes the names; the participant sees them", async () => {
      const applicationId = await makeApplication([{ termId: futureTermId }])
      expect(
        (await wishes(applicationId, organizer, futureTermId, { names: ["Eva Černá"] })).status,
      ).toBe(204)
      expect((await wishesOf(applicationId))?.roomWishes).toEqual(["Eva Černá"])
      expect((await wishes(applicationId, organizer, futureTermId, { names: [] })).status).toBe(204)
      expect((await wishesOf(applicationId))?.roomWishes).toEqual([])
      expect(
        (await history(applicationId)).filter(({ kind }) => kind === "LOGISTICS"),
      ).toHaveLength(2)
    })

    it("confirms „no wishes“ only without names and before the rooms are published", async () => {
      const applicationId = await makeApplication([{ termId: futureTermId }])
      expect(
        (
          await wishes(applicationId, organizer, futureTermId, {
            names: ["Eva"],
            noRoomWishes: true,
          })
        ).status,
      ).toBe(400)
      expect(
        (await wishes(applicationId, organizer, futureTermId, { names: [], noRoomWishes: true }))
          .status,
      ).toBe(204)
      expect((await wishesOf(applicationId))?.noRoomWishes).toBe(true)
      const published = await makeApplication([{ termId: futureTermId }])
      await prisma.term.update({
        where: { id: futureTermId },
        data: { roomsPublishedAt: new Date() },
      })
      const late = await wishes(published, organizer, futureTermId, {
        names: [],
        noRoomWishes: true,
      })
      await prisma.term.update({ where: { id: futureTermId }, data: { roomsPublishedAt: null } })
      expect(late.status).toBe(409)
    })

    it("has the conditions of the participant: confirmed term, no individual accommodation, own organization", async () => {
      const waitlisted = await makeApplication([{ termId: futureTermId, status: "WAITLISTED" }])
      const response = await wishes(waitlisted, organizer, futureTermId, { names: ["Eva"] })
      expect(response.status).toBe(409)
      expect(await response.json()).toMatchObject({ code: "ROOM_WISHES_NOT_AVAILABLE" })
      const individual = await makeApplication([{ termId: futureTermId }], true)
      expect((await wishes(individual, organizer, futureTermId, { names: ["Eva"] })).status).toBe(
        409,
      )
      const own = await makeApplication([{ termId: futureTermId }])
      expect((await wishes(own, foreignOrganizer, futureTermId, { names: ["Eva"] })).status).toBe(
        403,
      )
      expect((await wishes(own, participant, futureTermId, { names: ["Eva"] })).status).toBe(403)
    })
  })

  describe("#788 later arrival and earlier departure", () => {
    const stay = (applicationId: string, cookie: string, body: unknown) =>
      call(
        "PUT",
        `/organizer/applications/${applicationId}/terms/${futureTermId}/stay`,
        cookie,
        body,
      )

    it("writes the values for the participant, with the validation of the participant", async () => {
      const applicationId = await makeApplication([{ termId: futureTermId }])
      const body = { lateArrival: "2037-07-13T10:30", earlyDeparture: "2037-07-18T16:00" }
      expect((await stay(applicationId, organizer, body)).status).toBe(204)
      const response = await call("GET", `/participant/applications/${applicationId}`, participant)
      const detail = (await response.json()) as {
        terms: { stay?: unknown; priceCzk?: number; status: string }[]
      }
      expect(detail.terms[0]).toMatchObject({ stay: body, status: "CONFIRMED" })
      const kitchen = await call("GET", `/organizer/events/${eventId}/meals/summary`, organizer)
      const summary = (await kitchen.json()) as {
        termId: string
        stays: { applicationId: string }[]
      }[]
      expect(
        summary.find((term) => term.termId === futureTermId)!.stays.map((s) => s.applicationId),
      ).toContain(applicationId)
      expect(
        (
          await stay(applicationId, organizer, {
            lateArrival: "2037-08-01T10:00",
            earlyDeparture: null,
          })
        ).status,
      ).toBe(400)
      expect(
        (
          await stay(applicationId, organizer, {
            lateArrival: "2037-07-15T10:00",
            earlyDeparture: "2037-07-14T10:00",
          })
        ).status,
      ).toBe(400)
      expect(
        (await stay(applicationId, organizer, { lateArrival: null, earlyDeparture: null })).status,
      ).toBe(204)
      expect(
        (await history(applicationId)).filter(({ kind }) => kind === "LOGISTICS"),
      ).toHaveLength(2)
    })

    it("refuses a foreign organization", async () => {
      const applicationId = await makeApplication([{ termId: futureTermId }])
      const body = { lateArrival: null, earlyDeparture: null }
      expect((await stay(applicationId, foreignOrganizer, body)).status).toBe(403)
    })
  })

  describe("reading and the flags of the screens", () => {
    it("lists wishes and stay per term for the organizer of the organization only", async () => {
      const applicationId = await makeApplication([{ termId: futureTermId }])
      const path = `/organizer/applications/${applicationId}/arrangements`
      const response = await call("GET", path, organizer)
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        applicationId,
        terms: [
          {
            termId: futureTermId,
            roomWishes: { names: [], noRoomWishes: false, canDecline: true },
            stay: { lateArrival: null, earlyDeparture: null },
          },
        ],
      })
      expect((await call("GET", path, foreignOrganizer)).status).toBe(403)
      expect((await call("GET", path, participant)).status).toBe(403)
    })

    it("tells the participant's screen what is closed after the term is over (D-192)", async () => {
      const applicationId = await makeApplication([{ termId: pastTermId }])
      const detail = (await (
        await call("GET", `/participant/applications/${applicationId}`, participant)
      ).json()) as { mealsEditable: boolean; terms: { transportEditable: boolean }[] }
      expect(detail.mealsEditable).toBe(false)
      expect(detail.terms[0].transportEditable).toBe(false)
      const open = await makeApplication([{ termId: futureTermId }])
      const current = (await (
        await call("GET", `/participant/applications/${open}`, participant)
      ).json()) as { mealsEditable: boolean; terms: { transportEditable: boolean }[] }
      expect(current.mealsEditable).toBe(true)
      expect(current.terms[0].transportEditable).toBe(true)
    })
  })

  describe("#789 health restriction", () => {
    const write = (applicationId: string, cookie: string, body: unknown) =>
      call("PUT", `/organizer/applications/${applicationId}/health`, cookie, body)
    const stored = async (applicationId: string) =>
      (await (
        await call("GET", `/participant/applications/${applicationId}/health`, participant)
      ).json()) as {
        note: string | null
        noRestriction: boolean
        consentAt: string | null
      }

    it("refuses without the confirmed consent and saves with it", async () => {
      const applicationId = await makeApplication([{ termId: futureTermId }])
      const refused = await write(applicationId, organizer, {
        note: "Astma",
        consentConfirmed: false,
      })
      expect(refused.status).toBe(400)
      expect(await refused.json()).toMatchObject({ code: "HEALTH_ORGANIZER_CONSENT_REQUIRED" })
      expect((await stored(applicationId)).note).toBeNull()
      expect(
        (await write(applicationId, organizer, { note: "Astma", consentConfirmed: true })).status,
      ).toBe(200)
      expect(await stored(applicationId)).toMatchObject({ note: "Astma" })
      const entries = (await history(applicationId)).filter(({ kind }) => kind === "LOGISTICS")
      expect(entries[0]).toMatchObject({ field: "health", to: "WRITTEN" })
      expect(JSON.stringify(entries)).not.toContain("Astma")
    })

    it("confirms „no restriction“ only with the consent, and never changes a stored note", async () => {
      const applicationId = await makeApplication([{ termId: futureTermId }])
      expect(
        (
          await write(applicationId, organizer, {
            note: "",
            noRestriction: true,
            consentConfirmed: false,
          })
        ).status,
      ).toBe(400)
      expect(
        (
          await write(applicationId, organizer, {
            note: "",
            noRestriction: true,
            consentConfirmed: true,
          })
        ).status,
      ).toBe(200)
      expect((await stored(applicationId)).noRestriction).toBe(true)
      expect(
        (await write(applicationId, organizer, { note: "Astma", consentConfirmed: true })).status,
      ).toBe(200)
      const again = await write(applicationId, organizer, { note: "Jiné", consentConfirmed: true })
      expect(again.status).toBe(409)
      expect(await again.json()).toMatchObject({ code: "HEALTH_CHANGE_REQUEST_REQUIRED" })
      expect((await stored(applicationId)).note).toBe("Astma")
    })

    it("an empty note is not a deletion, and a foreign organization gets 403", async () => {
      const applicationId = await makeApplication([{ termId: futureTermId }])
      expect(
        (await write(applicationId, organizer, { note: "", consentConfirmed: true })).status,
      ).toBe(400)
      expect(
        (await write(applicationId, foreignOrganizer, { note: "Astma", consentConfirmed: true }))
          .status,
      ).toBe(403)
    })
  })

  describe("#790 meals end with the last term that is not cancelled", () => {
    const meals = { optionIds: [], allergies: "Ořechy", specialRequest: "", noRestrictions: false }
    const save = (applicationId: string, cookie: string) =>
      cookie === participant
        ? call("PUT", `/participant/applications/${applicationId}/meals`, cookie, meals)
        : call(
            "PUT",
            `/organizer/events/${eventId}/meals/applications/${applicationId}`,
            cookie,
            meals,
          )

    it("refuses both roles when every term is over", async () => {
      const applicationId = await makeApplication([{ termId: pastTermId }])
      for (const cookie of [organizer, participant]) {
        const response = await save(applicationId, cookie)
        expect(response.status).toBe(409)
        expect(await response.json()).toMatchObject({ code: "MEALS_EDIT_CLOSED" })
      }
    })

    it("allows both roles while a later term is still to come", async () => {
      const applicationId = await makeApplication([
        { termId: pastTermId },
        { termId: futureTermId },
      ])
      for (const cookie of [organizer, participant]) {
        expect((await save(applicationId, cookie)).status).toBe(200)
      }
    })

    it("does not count a cancelled term", async () => {
      const applicationId = await makeApplication([
        { termId: pastTermId },
        { termId: futureTermId },
      ])
      await prisma.applicationTerm.updateMany({
        where: { applicationId, termId: futureTermId },
        data: { status: "CANCELLED" },
      })
      for (const cookie of [organizer, participant]) {
        expect((await save(applicationId, cookie)).status).toBe(409)
      }
    })
  })
})
