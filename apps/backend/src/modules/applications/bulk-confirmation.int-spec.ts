// US-107: an organizer confirms many applications waiting for evaluation in a term at once.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Preview = {
  selectedCount: number
  freePlaces: { FEMALE: number; MALE: number }
  confirmable: { applicationId: string; name: string }[]
  skipped: { applicationId: string; name: string }[]
}

describe("bulk confirmation of applications in a term (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let foreignCookie: string
  let participantCookie: string
  let organizationId: string
  let eventId: string
  let termId: string
  let counter = 0

  const addApplication = async (
    gender: "FEMALE" | "MALE",
    minute: number,
    status: "TO_EVALUATE" | "WAITLISTED" = "TO_EVALUATE",
  ): Promise<string> => {
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: `us-107-${++counter}-${Date.now()}`,
        firstName: "Test",
        lastName: `Applicant${counter}`,
        birthDate: new Date("2010-01-01"),
        gender,
        email: `us107-${counter}@example.com`,
        consentAt: new Date(),
        submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
        terms: { create: [{ organizationId, termId, status, priceCzk: 1000 }] },
      },
    })
    return application.id
  }
  const post = (path: string, body: unknown, auth: string | undefined = cookie, term = termId) =>
    fetch(api(`/organizer/events/${eventId}/terms/${term}/bulk-confirmation${path}`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(auth ? { Cookie: auth } : {}) },
      body: JSON.stringify(body),
    })
  const statusOf = async (applicationId: string) =>
    (await prisma.applicationTerm.findFirstOrThrow({ where: { applicationId, termId } })).status

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
    // One women's bed and one men's bed.
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: "US-107",
        publicToken: "us-107-event",
        terms: {
          create: [
            {
              organizationId,
              number: 1,
              name: "T1",
              rooms: {
                create: [
                  { organizationId, name: "A", capacity: 1, gender: "FEMALE" },
                  { organizationId, name: "B", capacity: 1, gender: "MALE" },
                ],
              },
              startsOn: new Date("2027-07-01"),
              endsOn: new Date("2027-07-08"),
              priceCzk: 1000,
            },
          ],
        },
      },
      include: { terms: true },
    })
    eventId = event.id
    termId = event.terms[0].id
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("is for organizers of the event only", async () => {
    const body = { applicationIds: ["x"] }
    expect((await post("", body, undefined)).status).toBe(401)
    expect((await post("", body, participantCookie)).status).toBe(403)
    expect((await post("/preview", body, foreignCookie)).status).toBe(403)
    expect((await post("", body, foreignCookie)).status).toBe(403)
  })

  it("previews and confirms those that fit, in order of receipt, and leaves the rest unchanged", async () => {
    const jana = await addApplication("FEMALE", 3)
    const petr = await addApplication("MALE", 2)
    const adam = await addApplication("MALE", 1)
    const waitlisted = await addApplication("FEMALE", 0, "WAITLISTED")
    const ids = [jana, petr, adam, waitlisted]

    const preview = (await (await post("/preview", { applicationIds: ids })).json()) as Preview
    expect(preview.freePlaces).toEqual({ FEMALE: 1, MALE: 1 })
    expect(preview.confirmable.map((row) => row.applicationId)).toEqual([adam, jana])
    expect(preview.skipped.map((row) => row.applicationId)).toEqual([petr])
    expect(await statusOf(adam)).toBe("TO_EVALUATE")

    const response = await post("", { applicationIds: ids })
    expect(response.status).toBe(200)
    const result = (await response.json()) as { confirmed: string[]; unchanged: string[] }
    expect(result.confirmed).toEqual([adam, jana])
    expect(result.unchanged.sort()).toEqual([petr, waitlisted].sort())
    expect(await statusOf(adam)).toBe("CONFIRMED")
    expect(await statusOf(jana)).toBe("CONFIRMED")
    expect(await statusOf(petr)).toBe("TO_EVALUATE")
    expect(await statusOf(waitlisted)).toBe("WAITLISTED")
    // The same log entry as a single confirmation.
    const log = await prisma.applicationTermStatusChange.findFirstOrThrow({
      where: { applicationTerm: { applicationId: adam } },
    })
    expect(log).toMatchObject({ fromStatus: "TO_EVALUATE", toStatus: "CONFIRMED" })
    expect(log.changedById).not.toBeNull()
  })

  it("confirms nobody once the beds are taken, and answers 404 for a term of another event", async () => {
    const late = await addApplication("MALE", 9)
    const result = (await (await post("", { applicationIds: [late] })).json()) as {
      confirmed: string[]
    }
    expect(result.confirmed).toEqual([])
    expect(await statusOf(late)).toBe("TO_EVALUATE")
    expect((await post("", { applicationIds: [late] }, cookie, "unknown-term")).status).toBe(404)
  })
})
