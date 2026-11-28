import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Listing = {
  requests: {
    applicationTermId: string
    applicationId: string
    lastName: string
    status: string
    request: string | null
  }[]
}

describe("individual accommodation requests of a term (integration, #514)", () => {
  let prisma: PrismaService
  let cookie: string
  let participantCookie: string
  let foreignCookie: string
  let organizationId: string
  let eventId: string
  let term1: string
  let term2: string
  let counter = 0

  const call = (path: string, session = cookie): Promise<Response> =>
    fetch(api(path), { headers: { Cookie: session } })
  const path = (term: string): string =>
    `/organizer/events/${eventId}/terms/${term}/individual-requests`
  const makeApplication = async (
    lastName: string,
    individual: boolean,
    request: string | null,
    terms: { termId: string; status: "CONFIRMED" | "WAITLISTED" | "CANCELLED" | "ARCHIVED" }[],
  ): Promise<{ applicationId: string; rows: Record<string, string> }> => {
    counter += 1
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: randomUUID(),
        firstName: "Test",
        lastName,
        birthDate: new Date("2010-01-01"),
        gender: "FEMALE",
        email: `ir514-${counter}@example.com`,
        consentAt: new Date(),
        individualAccommodation: individual,
        accommodationRequest: request,
        terms: {
          create: terms.map(({ termId, status }) => ({
            organizationId,
            termId,
            status,
            priceCzk: 1000,
          })),
        },
      },
      include: { terms: true },
    })
    return {
      applicationId: application.id,
      rows: Object.fromEntries(application.terms.map((row) => [row.termId, row.id])),
    }
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    organizationId = member.organizationId
    eventId = (
      await prisma.event.create({
        data: { organizationId, name: "#514", publicToken: `ir514-${randomUUID()}` },
      })
    ).id
    const makeTerm = async (number: number, startsOn: string): Promise<string> =>
      (
        await prisma.term.create({
          data: {
            organizationId,
            eventId,
            number,
            name: `T${number}`,
            startsOn: new Date(startsOn),
            endsOn: new Date(startsOn),
            priceCzk: 1000,
          },
        })
      ).id
    term1 = await makeTerm(1, "2027-07-01")
    term2 = await makeTerm(2, "2027-07-08")
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("lists only the individual requests of the chosen term, sorted by last name", async () => {
    const beta = await makeApplication("Beta", true, "Pokoj v přízemí.", [
      { termId: term1, status: "CONFIRMED" },
      { termId: term2, status: "CONFIRMED" },
    ])
    await makeApplication("Alfa", true, null, [{ termId: term1, status: "WAITLISTED" }])
    await makeApplication("Bez požadavku", false, null, [{ termId: term1, status: "CONFIRMED" }])
    await makeApplication("Jen druhý", true, "Až ve druhém termínu.", [
      { termId: term2, status: "CONFIRMED" },
    ])
    const first = (await (await call(path(term1))).json()) as Listing
    expect(first.requests.map((row) => row.lastName)).toEqual(["Alfa", "Beta"])
    expect(first.requests[0]).toMatchObject({ request: null, status: "WAITLISTED" })
    expect(first.requests[1]).toMatchObject({
      request: "Pokoj v přízemí.",
      applicationId: beta.applicationId,
      applicationTermId: beta.rows[term1],
    })
    const second = (await (await call(path(term2))).json()) as Listing
    expect(second.requests.map((row) => row.lastName)).toEqual(["Beta", "Jen druhý"])
  })

  it("leaves out cancelled and archived applications in the term", async () => {
    await makeApplication("Zrušená", true, "Zrušeno.", [{ termId: term2, status: "CANCELLED" }])
    await makeApplication("Archivovaná", true, "Archiv.", [{ termId: term2, status: "ARCHIVED" }])
    const body = (await (await call(path(term2))).json()) as Listing
    expect(body.requests.map((row) => row.lastName)).not.toContain("Zrušená")
    expect(body.requests.map((row) => row.lastName)).not.toContain("Archivovaná")
  })

  it("is protected by session, role and organization", async () => {
    expect((await call(path(term1), "")).status).toBe(401)
    expect((await call(path(term1), participantCookie)).status).toBe(403)
    expect((await call(path(term1), foreignCookie)).status).toBe(403)
    expect((await call(path(randomUUID()))).status).toBe(403)
  })
})
