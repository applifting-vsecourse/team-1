// US-140: an organizer evaluates the selected applications of a term in one step: those that fit
// are confirmed, the rest become substitutes.
import { PrismaService } from "@/core/prisma/prisma.service"
import {
  api,
  connectTestPrisma,
  hasSentNothingTo,
  latestEmailTo,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

type Status = "TO_EVALUATE" | "CONFIRMED" | "WAITLISTED" | "CANCELLED"
type Gender = "FEMALE" | "MALE"
type Preview = {
  selected: { total: number; byGender: Record<Gender, number> }
  confirm: { total: number; byGender: Record<Gender, number> }
  rest: { total: number; byGender: Record<Gender, number> }
  freePlaces: Record<Gender, number>
  isShared: boolean
}
type Result = {
  confirmed: string[]
  waitlisted: string[]
  rejected: string[]
  unchanged: string[]
}

describe("bulk evaluation of applications in a term (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let foreignCookie: string
  let participantCookie: string
  let organizationId: string
  let eventId: string
  let genderedTermId: string
  let sharedTermId: string
  let counter = 0

  const addApplication = async (
    termId: string,
    gender: Gender,
    minute: number,
    status: Status = "TO_EVALUATE",
  ): Promise<{ id: string; email: string }> => {
    const email = `us140-${++counter}-${Date.now()}@example.com`
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: `us-140-${counter}-${Date.now()}`,
        firstName: "Test",
        lastName: `Applicant${counter}`,
        birthDate: new Date("2010-01-01"),
        gender,
        email,
        consentAt: new Date(),
        submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
        terms: { create: [{ organizationId, termId, status, priceCzk: 1000 }] },
      },
    })
    return { id: application.id, email }
  }
  const post = (termId: string, path: string, body: unknown, auth: string | null = cookie) =>
    fetch(api(`/organizer/events/${eventId}/terms/${termId}/bulk-evaluation${path}`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(auth ? { Cookie: auth } : {}) },
      body: JSON.stringify(body),
    })
  const statusOf = async (applicationId: string) =>
    (await prisma.applicationTerm.findFirstOrThrow({ where: { applicationId } })).status

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
      include: { memberships: true },
    })
    organizationId = organizer.memberships[0].organizationId
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: "US-140",
        publicToken: "us-140-event",
        terms: {
          create: [
            {
              organizationId,
              number: 1,
              name: "Gendered",
              // Two men's beds and one women's bed.
              rooms: {
                create: [
                  { organizationId, name: "M", capacity: 2, gender: "MALE" },
                  { organizationId, name: "F", capacity: 1, gender: "FEMALE" },
                ],
              },
              startsOn: new Date("2027-07-01"),
              endsOn: new Date("2027-07-08"),
              priceCzk: 1000,
            },
            {
              organizationId,
              number: 2,
              name: "Shared",
              rooms: { create: [{ organizationId, name: "S", capacity: 10 }] },
              startsOn: new Date("2027-08-01"),
              endsOn: new Date("2027-08-08"),
              priceCzk: 1000,
            },
          ],
        },
      },
      include: { terms: { orderBy: { number: "asc" } } },
    })
    eventId = event.id
    genderedTermId = event.terms[0].id
    sharedTermId = event.terms[1].id
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("is for organizers of the event only, and changes nothing in a foreign one", async () => {
    const victim = await addApplication(genderedTermId, "MALE", 50)
    const body = { applicationIds: [victim.id], expectedConfirmed: { FEMALE: 0, MALE: 1 } }
    expect((await post(genderedTermId, "", body, null)).status).toBe(401)
    expect((await post(genderedTermId, "", body, participantCookie)).status).toBe(403)
    expect(
      (await post(genderedTermId, "/preview", { applicationIds: [victim.id] }, foreignCookie))
        .status,
    ).toBe(403)
    const foreign = await post(genderedTermId, "", body, foreignCookie)
    expect(foreign.status).toBe(403)
    expect(await foreign.text()).not.toContain(victim.id)
    expect(await statusOf(victim.id)).toBe("TO_EVALUATE")
    await prisma.application.delete({ where: { id: victim.id } })
  })

  it("previews, then confirms into the free beds of each gender and waitlists the rest, leaving everything else as it is", async () => {
    const m3 = await addApplication(genderedTermId, "MALE", 3)
    const f2 = await addApplication(genderedTermId, "FEMALE", 5)
    const m1 = await addApplication(genderedTermId, "MALE", 1)
    const f1 = await addApplication(genderedTermId, "FEMALE", 4)
    const m2 = await addApplication(genderedTermId, "MALE", 2)
    const alreadyWaitlisted = await addApplication(genderedTermId, "MALE", 0, "WAITLISTED")
    const notSelected = await addApplication(genderedTermId, "FEMALE", 6)
    const ids = [m3.id, f2.id, m1.id, f1.id, m2.id, alreadyWaitlisted.id]

    const preview = (await (
      await post(genderedTermId, "/preview", { applicationIds: ids })
    ).json()) as Preview
    expect(preview.selected).toEqual({ total: 5, byGender: { FEMALE: 2, MALE: 3 } })
    expect(preview.confirm).toEqual({ total: 3, byGender: { FEMALE: 1, MALE: 2 } })
    expect(preview.rest).toEqual({ total: 2, byGender: { FEMALE: 1, MALE: 1 } })
    expect(preview.freePlaces).toEqual({ FEMALE: 1, MALE: 2 })
    expect(await statusOf(m1.id)).toBe("TO_EVALUATE")

    const response = await post(genderedTermId, "", {
      applicationIds: ids,
      expectedConfirmed: { FEMALE: 1, MALE: 2 },
      rest: "WAITLIST",
    })
    expect(response.status).toBe(200)
    const result = (await response.json()) as Result
    expect(result.confirmed).toEqual([m1.id, m2.id, f1.id])
    expect(result.waitlisted).toEqual([m3.id, f2.id])
    expect(result.unchanged).toEqual([alreadyWaitlisted.id])
    for (const { id } of [m1, m2, f1]) expect(await statusOf(id)).toBe("CONFIRMED")
    for (const { id } of [m3, f2]) expect(await statusOf(id)).toBe("WAITLISTED")
    expect(await statusOf(alreadyWaitlisted.id)).toBe("WAITLISTED")
    expect(await statusOf(notSelected.id)).toBe("TO_EVALUATE")

    // Each change is an individual decision: a log entry by the organizer and one e-mail.
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
    })
    const toStatus = { [m1.id]: "CONFIRMED", [f2.id]: "WAITLISTED" } as const
    for (const [id, status] of Object.entries(toStatus)) {
      const log = await prisma.applicationTermStatusChange.findMany({
        where: { applicationTerm: { applicationId: id } },
      })
      expect(log).toHaveLength(1)
      expect(log[0]).toMatchObject({
        fromStatus: "TO_EVALUATE",
        toStatus: status,
        changedById: organizer.id,
      })
    }
    expect(await latestEmailTo(m1.email)).toBeDefined()
    expect(await latestEmailTo(f2.email)).toBeDefined()
    expect(await hasSentNothingTo(notSelected.email)).toBe(true)
  })

  it("answers 409 and changes nothing when the capacity changed since the preview", async () => {
    // Nothing is free in the gendered term any more, so the previewed 1 is no longer true.
    const late = await addApplication(genderedTermId, "MALE", 60)
    const response = await post(genderedTermId, "", {
      applicationIds: [late.id],
      expectedConfirmed: { FEMALE: 0, MALE: 1 },
      rest: "WAITLIST",
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "EVALUATION_PLAN_CHANGED" })
    expect(await statusOf(late.id)).toBe("TO_EVALUATE")

    const again = await post(genderedTermId, "", {
      applicationIds: [late.id],
      expectedConfirmed: { FEMALE: 0, MALE: 0 },
      rest: "WAITLIST",
    })
    expect(again.status).toBe(200)
    expect(((await again.json()) as Result).waitlisted).toEqual([late.id])
  })

  it("asks for a choice when some do not fit, then confirms 10 of 20 and rejects the other 10 like a single rejection", async () => {
    const ids: string[] = []
    for (let index = 0; index < 20; index++)
      ids.push((await addApplication(sharedTermId, index % 2 ? "FEMALE" : "MALE", index)).id)

    const preview = (await (
      await post(sharedTermId, "/preview", { applicationIds: ids })
    ).json()) as Preview
    expect(preview).toMatchObject({ isShared: true, confirm: { total: 10 }, rest: { total: 10 } })

    // Without the choice nothing is evaluated.
    const missing = await post(sharedTermId, "", {
      applicationIds: ids,
      expectedConfirmed: { FEMALE: 5, MALE: 5 },
    })
    expect(missing.status).toBe(400)
    expect(await missing.json()).toMatchObject({ code: "EVALUATION_REST_REQUIRED" })
    expect(await statusOf(ids[0])).toBe("TO_EVALUATE")

    const result = (await (
      await post(sharedTermId, "", {
        applicationIds: ids,
        expectedConfirmed: { FEMALE: 5, MALE: 5 },
        rest: "REJECT",
      })
    ).json()) as Result
    expect(result.confirmed).toEqual(ids.slice(0, 10))
    expect(result.rejected).toEqual(ids.slice(10))
    expect(result.waitlisted).toEqual([])
    expect(
      await prisma.applicationTerm.count({
        where: { termId: sharedTermId, status: "TO_EVALUATE" },
      }),
    ).toBe(0)
    expect(await statusOf(ids[10])).toBe("CANCELLED")

    // A rejection like US-108: a log entry by the organizer and the rejection e-mail.
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
    })
    const log = await prisma.applicationTermStatusChange.findMany({
      where: { applicationTerm: { applicationId: ids[10] } },
    })
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({
      fromStatus: "TO_EVALUATE",
      toStatus: "CANCELLED",
      changedById: organizer.id,
    })
    const rejected = await prisma.application.findUniqueOrThrow({ where: { id: ids[10] } })
    expect(await latestEmailTo(rejected.email)).toBeDefined()
  })

  it("answers 404 for a term of another event", async () => {
    expect(
      (
        await post("unknown-term", "", {
          applicationIds: ["x"],
          expectedConfirmed: { FEMALE: 0, MALE: 0 },
        })
      ).status,
    ).toBe(404)
  })
})
