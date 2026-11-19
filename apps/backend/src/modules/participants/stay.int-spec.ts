// US-143: a participant gives a later arrival or an earlier departure; the kitchen summary shows it.
import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Stay = { lateArrival: string | null; earlyDeparture: string | null }

describe("later arrival and earlier departure (integration)", () => {
  let prisma: PrismaService
  let organizerCookie: string
  let participantCookie: string
  let organizationId: string
  let eventId: string
  let termId: string
  let counter = 0

  const makeApplication = async (
    status: "CONFIRMED" | "WAITLISTED" | "TO_EVALUATE" | "CANCELLED" | "ARCHIVED",
    names = { firstName: "Test", lastName: "Příjezd" },
  ): Promise<{ applicationId: string; applicationTermId: string }> => {
    counter += 1
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        userId: user.id,
        accessToken: randomUUID(),
        ...names,
        birthDate: new Date("2010-01-01"),
        gender: "FEMALE",
        email: `us143-${counter}@example.com`,
        consentAt: new Date(),
        terms: { create: [{ organizationId, termId, status, priceCzk: 1000 }] },
      },
      include: { terms: true },
    })
    return { applicationId: application.id, applicationTermId: application.terms[0].id }
  }
  const save = (applicationId: string, body: unknown, cookie = participantCookie) =>
    fetch(api(`/participant/applications/${applicationId}/terms/${termId}/stay`), {
      method: "PUT",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  const stayOf = async (applicationId: string): Promise<Stay | undefined> => {
    const response = await fetch(api(`/participant/applications/${applicationId}`), {
      headers: { Cookie: participantCookie },
    })
    const body = (await response.json()) as { terms: { termId: string; stay?: Stay }[] }
    return body.terms.find((term) => term.termId === termId)?.stay
  }
  const kitchenStays = async (): Promise<(Stay & { applicationId: string })[]> => {
    const response = await fetch(api(`/organizer/events/${eventId}/meals/summary`), {
      headers: { Cookie: organizerCookie },
    })
    const body = (await response.json()) as {
      termId: string
      stays: (Stay & { applicationId: string })[]
    }[]
    return body.find((term) => term.termId === termId)!.stays
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    organizerCookie = await signIn("organizator@example.com", "password1")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    organizationId = member.organizationId
    eventId = (
      await prisma.event.create({
        data: { organizationId, name: "US-143", publicToken: `us143-${randomUUID()}` },
      })
    ).id
    termId = (
      await prisma.term.create({
        data: {
          organizationId,
          eventId,
          number: 1,
          startsOn: new Date("2027-07-12"),
          endsOn: new Date("2027-07-19"),
          priceCzk: 1000,
        },
      })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("requires a participant session", async () => {
    const { applicationId } = await makeApplication("CONFIRMED")
    const body = { lateArrival: null, earlyDeparture: null }
    expect((await save(applicationId, body, "")).status).toBe(401)
    expect((await save(applicationId, body, organizerCookie)).status).toBe(403)
  })

  it("has no arrival or departure until one is given", async () => {
    const { applicationId } = await makeApplication("CONFIRMED")
    expect(await stayOf(applicationId)).toEqual({ lateArrival: null, earlyDeparture: null })
  })

  it("sets, changes and deletes the values, together or one by one", async () => {
    const { applicationId } = await makeApplication("CONFIRMED")
    const both = { lateArrival: "2027-07-13T10:30", earlyDeparture: "2027-07-18T16:00" }
    expect((await save(applicationId, both)).status).toBe(204)
    expect(await stayOf(applicationId)).toEqual(both)
    expect((await save(applicationId, { ...both, lateArrival: null })).status).toBe(204)
    expect(await stayOf(applicationId)).toEqual({
      lateArrival: null,
      earlyDeparture: both.earlyDeparture,
    })
    expect(
      (await save(applicationId, { lateArrival: "2027-07-14T09:00", earlyDeparture: null })).status,
    ).toBe(204)
    expect(await stayOf(applicationId)).toEqual({
      lateArrival: "2027-07-14T09:00",
      earlyDeparture: null,
    })
    expect((await save(applicationId, { lateArrival: null, earlyDeparture: null })).status).toBe(
      204,
    )
    expect(await stayOf(applicationId)).toEqual({ lateArrival: null, earlyDeparture: null })
  })

  it("is allowed for a term to evaluate, confirmed or waitlisted", async () => {
    for (const status of ["TO_EVALUATE", "WAITLISTED"] as const) {
      const { applicationId } = await makeApplication(status)
      expect(
        (await save(applicationId, { lateArrival: "2027-07-13T10:30", earlyDeparture: null }))
          .status,
      ).toBe(204)
    }
  })

  it("is refused for a cancelled or archived term and for someone else's application", async () => {
    for (const status of ["CANCELLED", "ARCHIVED"] as const) {
      const { applicationId } = await makeApplication(status)
      expect(await stayOf(applicationId)).toBeUndefined()
      const response = await save(applicationId, {
        lateArrival: "2027-07-13T10:30",
        earlyDeparture: null,
      })
      expect(response.status).toBe(409)
      expect((await response.json()).code).toBe("STAY_NOT_AVAILABLE")
    }
    const other = await prisma.user.findFirstOrThrow({
      where: { email: { not: "ucastnik@example.com" } },
    })
    const foreign = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        userId: other.id,
        accessToken: randomUUID(),
        firstName: "Cizí",
        lastName: "Přihláška",
        birthDate: new Date("2010-01-01"),
        gender: "FEMALE",
        email: "us143-foreign@example.com",
        consentAt: new Date(),
        terms: { create: [{ organizationId, termId, status: "CONFIRMED", priceCzk: 1000 }] },
      },
    })
    expect((await save(foreign.id, { lateArrival: null, earlyDeparture: null })).status).toBe(403)
  })

  it("refuses a day outside the term and stores nothing", async () => {
    const { applicationId } = await makeApplication("CONFIRMED")
    const arrival = await save(applicationId, {
      lateArrival: "2027-07-11T10:30",
      earlyDeparture: null,
    })
    expect(arrival.status).toBe(400)
    expect((await arrival.json()).code).toBe("STAY_ARRIVAL_OUTSIDE_TERM")
    const departure = await save(applicationId, {
      lateArrival: null,
      earlyDeparture: "2027-07-20T10:30",
    })
    expect(departure.status).toBe(400)
    expect((await departure.json()).code).toBe("STAY_DEPARTURE_OUTSIDE_TERM")
    expect(await stayOf(applicationId)).toEqual({ lateArrival: null, earlyDeparture: null })
  })

  it("refuses a departure that is not later than the arrival", async () => {
    const { applicationId } = await makeApplication("CONFIRMED")
    const response = await save(applicationId, {
      lateArrival: "2027-07-13T10:30",
      earlyDeparture: "2027-07-13T09:45",
    })
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("STAY_DEPARTURE_NOT_AFTER_ARRIVAL")
    expect(await stayOf(applicationId)).toEqual({ lateArrival: null, earlyDeparture: null })
  })

  it("refuses malformed input", async () => {
    const { applicationId } = await makeApplication("CONFIRMED")
    expect(
      (await save(applicationId, { lateArrival: "13. 7. 2027", earlyDeparture: null })).status,
    ).toBe(400)
    expect(
      (await save(applicationId, { lateArrival: "2027-02-30T10:30", earlyDeparture: null })).status,
    ).toBe(400)
    expect((await save(applicationId, { lateArrival: 5, earlyDeparture: null })).status).toBe(400)
    expect((await save(applicationId, {})).status).toBe(400)
  })

  it("changes neither price, status nor the counts, and shows up in the kitchen summary", async () => {
    const confirmed = await makeApplication("CONFIRMED", { firstName: "Adam", lastName: "Dvořák" })
    const waitlisted = await makeApplication("WAITLISTED", {
      firstName: "Petr",
      lastName: "Náhradník",
    })
    const before = await fetch(api(`/organizer/events/${eventId}/meals/summary`), {
      headers: { Cookie: organizerCookie },
    })
    const totalBefore = ((await before.json()) as { total: number }[])[0].total
    await save(confirmed.applicationId, {
      lateArrival: "2027-07-13T10:30",
      earlyDeparture: "2027-07-18T16:00",
    })
    await save(waitlisted.applicationId, { lateArrival: "2027-07-13T10:30", earlyDeparture: null })

    const row = await prisma.applicationTerm.findUniqueOrThrow({
      where: { id: confirmed.applicationTermId },
    })
    expect(row).toMatchObject({ status: "CONFIRMED", priceCzk: 1000 })
    const stays = await kitchenStays()
    expect(stays).toContainEqual({
      applicationId: confirmed.applicationId,
      firstName: "Adam",
      lastName: "Dvořák",
      lateArrival: "2027-07-13T10:30",
      earlyDeparture: "2027-07-18T16:00",
    })
    // Only the confirmed participants are in the kitchen summary.
    expect(stays.map((entry) => entry.applicationId)).not.toContain(waitlisted.applicationId)
    const after = await fetch(api(`/organizer/events/${eventId}/meals/summary`), {
      headers: { Cookie: organizerCookie },
    })
    expect(((await after.json()) as { total: number }[])[0].total).toBe(totalBefore)
  })
})
