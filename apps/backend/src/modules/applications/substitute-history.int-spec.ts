// US-105: every confirmation from the waitlist leaves a system record of who was confirmed, who
// was skipped, who did it and when.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Record = {
  id: string
  termId: string
  group: "FEMALE" | "MALE" | "SHARED"
  confirmed: { applicationId: string; name: string }
  skipped: { applicationId: string; name: string; status: string }[]
  changedByName: string | null
  changedAt: string
}
type Detail = { termId: string; substituteRecords: Record[] }[]

describe("record of confirmed and skipped substitutes (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let foreignCookie: string
  let participantCookie: string
  let organizationId: string
  let organizerName: string
  let counter = 0

  type Scope = { eventId: string; termId: string }

  const createEvent = async (
    name: string,
    token: string,
    options: { capacity: number; shared?: boolean; gender?: "MALE" | "FEMALE" },
  ): Promise<Scope> => {
    const event = await prisma.event.create({
      data: {
        organizationId,
        name,
        publicToken: token,
        evaluationMode: "MANUAL",
        terms: {
          create: [
            {
              organizationId,
              number: 1,
              name: "T1",
              roomMode: options.shared ? "SHARED" : "GENDERED",
              rooms: {
                create: [
                  {
                    organizationId,
                    name: "A",
                    capacity: options.capacity,
                    gender: options.shared ? null : (options.gender ?? "MALE"),
                  },
                ],
              },
              startsOn: new Date("2027-07-01"),
              endsOn: new Date("2027-07-08"),
              priceCzk: 4900,
            },
          ],
        },
      },
      include: { terms: true },
    })
    return { eventId: event.id, termId: event.terms[0].id }
  }

  const addApplication = async (
    scope: Scope,
    gender: "FEMALE" | "MALE",
    minute: number,
    status: "CONFIRMED" | "WAITLISTED" = "WAITLISTED",
  ): Promise<string> => {
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId: scope.eventId,
        accessToken: `us-105-${++counter}-${Date.now()}`,
        firstName: "Test",
        lastName: `Applicant${counter}`,
        birthDate: new Date("2010-01-01"),
        gender,
        email: `us105-${counter}@example.com`,
        consentAt: new Date(),
        submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
        terms: {
          create: [{ organizationId, termId: scope.termId, status, priceCzk: 4900 }],
        },
      },
    })
    return application.id
  }

  const confirmViaSubstitutes = (scope: Scope, applicationId: string) =>
    fetch(
      api(
        `/organizer/events/${scope.eventId}/terms/${scope.termId}/substitutes/${applicationId}/confirm`,
      ),
      { method: "POST", headers: { Cookie: cookie } },
    )
  const confirmByHand = (scope: Scope, applicationId: string) =>
    fetch(api(`/organizer/applications/${applicationId}/terms/${scope.termId}/status`), {
      method: "PATCH",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONFIRMED" }),
    })
  const history = (scope: Scope, auth: string | null = cookie) =>
    fetch(api(`/organizer/events/${scope.eventId}/terms/${scope.termId}/substitutes/history`), {
      headers: auth ? { Cookie: auth } : {},
    })
  const records = async (scope: Scope): Promise<Record[]> =>
    (await (await history(scope)).json()) as Record[]
  const detail = async (applicationId: string, auth: string | null = cookie) =>
    fetch(api(`/organizer/applications/${applicationId}/terms`), {
      headers: auth ? { Cookie: auth } : {},
    })
  const skipRows = () => prisma.applicationTermSkip.count()

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
    organizerName = organizer.name
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("records who was confirmed, who was skipped, by whom and when (US-104 path)", async () => {
    const scope = await createEvent("US-105 a", "us-105-a", { capacity: 5 })
    const first = await addApplication(scope, "MALE", 1)
    const second = await addApplication(scope, "MALE", 2)
    const third = await addApplication(scope, "MALE", 3)
    const fourth = await addApplication(scope, "MALE", 4)
    const before = Date.now()

    expect((await confirmViaSubstitutes(scope, third)).status).toBe(204)

    const [record, ...rest] = await records(scope)
    expect(rest).toEqual([])
    expect(record.confirmed.applicationId).toBe(third)
    expect(record.skipped.map((person) => person.applicationId)).toEqual([first, second])
    expect(record.skipped.every((person) => person.status === "WAITLISTED")).toBe(true)
    expect(record.skipped.map((person) => person.applicationId)).not.toContain(fourth)
    expect(record.group).toBe("MALE")
    expect(record.termId).toBe(scope.termId)
    expect(record.changedByName).toBe(organizerName)
    expect(new Date(record.changedAt).getTime()).toBeGreaterThanOrEqual(before - 1000)
    expect(new Date(record.changedAt).getTime()).toBeLessThanOrEqual(Date.now() + 1000)
  })

  it("shows the record in the detail of the confirmed and of the skipped application", async () => {
    const scope = await createEvent("US-105 b", "us-105-b", { capacity: 5 })
    const first = await addApplication(scope, "MALE", 1)
    const second = await addApplication(scope, "MALE", 2)
    const third = await addApplication(scope, "MALE", 3)
    await confirmViaSubstitutes(scope, third)

    for (const id of [third, first, second]) {
      const terms = (await (await detail(id)).json()) as Detail
      expect(terms).toHaveLength(1)
      expect(terms[0].substituteRecords).toHaveLength(1)
      expect(terms[0].substituteRecords[0].confirmed.applicationId).toBe(third)
      expect(terms[0].substituteRecords[0].skipped.map((p) => p.applicationId)).toEqual([
        first,
        second,
      ])
    }
  })

  it("records the same for the manual status change (US-28 path)", async () => {
    const scope = await createEvent("US-105 c", "us-105-c", { capacity: 5 })
    const first = await addApplication(scope, "MALE", 1)
    const second = await addApplication(scope, "MALE", 2)

    expect((await confirmByHand(scope, second)).status).toBe(204)

    const [record] = await records(scope)
    expect(record.confirmed.applicationId).toBe(second)
    expect(record.skipped.map((person) => person.applicationId)).toEqual([first])
    expect(record.changedByName).toBe(organizerName)
  })

  it("records nobody skipped when the first in the order is confirmed", async () => {
    const scope = await createEvent("US-105 d", "us-105-d", { capacity: 5 })
    const first = await addApplication(scope, "MALE", 1)
    await addApplication(scope, "MALE", 2)

    expect((await confirmViaSubstitutes(scope, first)).status).toBe(204)

    const [record] = await records(scope)
    expect(record.confirmed.applicationId).toBe(first)
    expect(record.skipped).toEqual([])
  })

  it("does not record a confirmation that is not from the waitlist", async () => {
    const scope = await createEvent("US-105 e", "us-105-e", { capacity: 5 })
    const toEvaluate = await addApplication(scope, "MALE", 1)
    await prisma.applicationTerm.updateMany({
      where: { applicationId: toEvaluate },
      data: { status: "TO_EVALUATE" },
    })
    await addApplication(scope, "MALE", 2)

    expect((await confirmByHand(scope, toEvaluate)).status).toBe(204)
    expect(await records(scope)).toEqual([])
  })

  it("skips only the same gender in gendered rooms and everybody in one shared queue", async () => {
    const gendered = await createEvent("US-105 f", "us-105-f", { capacity: 5 })
    await prisma.room.create({
      data: { organizationId, termId: gendered.termId, name: "W", capacity: 5, gender: "FEMALE" },
    })
    const man = await addApplication(gendered, "MALE", 1)
    await addApplication(gendered, "FEMALE", 2)
    const secondMan = await addApplication(gendered, "MALE", 3)
    await confirmViaSubstitutes(gendered, secondMan)
    expect((await records(gendered))[0].skipped.map((p) => p.applicationId)).toEqual([man])

    const shared = await createEvent("US-105 g", "us-105-g", { capacity: 5, shared: true })
    const sharedMan = await addApplication(shared, "MALE", 1)
    const sharedWoman = await addApplication(shared, "FEMALE", 2)
    const last = await addApplication(shared, "MALE", 3)
    await confirmViaSubstitutes(shared, last)
    const [record] = await records(shared)
    expect(record.group).toBe("SHARED")
    expect(record.skipped.map((person) => person.applicationId)).toEqual([sharedMan, sharedWoman])
  })

  it("leaves nothing behind when the confirmation fails", async () => {
    const scope = await createEvent("US-105 h", "us-105-h", { capacity: 1 })
    await addApplication(scope, "MALE", 0, "CONFIRMED")
    await addApplication(scope, "MALE", 1)
    const second = await addApplication(scope, "MALE", 2)
    const changes = await prisma.applicationTermStatusChange.count()
    const skips = await skipRows()

    expect((await confirmByHand(scope, second)).status).toBe(409)
    expect((await confirmViaSubstitutes(scope, second)).status).toBe(409)

    expect(await prisma.applicationTermStatusChange.count()).toBe(changes)
    expect(await skipRows()).toBe(skips)
    expect(await records(scope)).toEqual([])
  })

  it("is for organizers of the event only and read-only", async () => {
    const scope = await createEvent("US-105 i", "us-105-i", { capacity: 5 })
    const first = await addApplication(scope, "MALE", 1)
    await confirmViaSubstitutes(scope, first)

    expect((await history(scope, null)).status).toBe(401)
    expect((await history(scope, foreignCookie)).status).toBe(403)
    expect((await history(scope, participantCookie)).status).toBe(403)
    expect((await detail(first, null)).status).toBe(401)
    expect((await detail(first, foreignCookie)).status).toBe(403)
    expect((await detail(first, participantCookie)).status).toBe(403)

    const write = await fetch(
      api(`/organizer/events/${scope.eventId}/terms/${scope.termId}/substitutes/history`),
      { method: "DELETE", headers: { Cookie: cookie } },
    )
    expect(write.status).toBe(404)
    expect((await records(scope)).length).toBe(1)
  })

  it("answers 404 for a term of another event", async () => {
    const scope = await createEvent("US-105 j", "us-105-j", { capacity: 1 })
    const response = await history({ eventId: scope.eventId, termId: "unknown" })
    expect(response.status).toBe(404)
  })
})
