import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Created = { applicationId: string; number: number }

describe("organizer adds an application (US-83)", () => {
  let prisma: PrismaService
  let eventId: string
  let termIds: string[]
  let cookie: string
  let foreignCookie: string
  let participantCookie: string
  let organizerId: string
  let counter = 0

  const input = (status: "CONFIRMED" | "WAITLISTED", override: object = {}): object => ({
    firstName: "Manual",
    lastName: `Participant${++counter}`,
    birthDate: "2000-05-15",
    gender: "FEMALE",
    email: `manual-${counter}@example.com`,
    phone: "+420 777 123 456",
    consent: true,
    terms: [
      { termId: termIds[0], status },
      { termId: termIds[1], status: "WAITLISTED" },
    ],
    ...override,
  })

  const create = (body: object, auth: string | null = cookie): Promise<Response> =>
    fetch(api(`/organizer/events/${eventId}/applications`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(auth ? { Cookie: auth } : {}) },
      body: JSON.stringify(body),
    })

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
    organizerId = organizer.id
    const organizationId = organizer.memberships[0].organizationId
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: "Manual event",
        publicToken: "us-83-event",
        terms: {
          create: ["First", "Second"].map((name, index) => ({
            organizationId,
            name,
            number: index + 1,
            startsOn: new Date(`2027-07-0${index + 1}`),
            endsOn: new Date(`2027-07-0${index + 2}`),
            priceCzk: index === 0 ? 4900 : 5600,
            rooms: { create: [{ organizationId, name: "A", capacity: 1, gender: "FEMALE" }] },
          })),
        },
      },
      include: { terms: { orderBy: { number: "asc" } } },
    })
    eventId = event.id
    termIds = event.terms.map((term) => term.id)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("requires an organizer who belongs to the event organization", async () => {
    const body = input("CONFIRMED")
    expect((await create(body, null)).status).toBe(401)
    expect((await create(body, participantCookie)).status).toBe(403)
    expect((await create(body, foreignCookie)).status).toBe(403)
  })

  it("validates consent, phone, birth date and term choices", async () => {
    expect((await create(input("CONFIRMED", { consent: false }))).status).toBe(400)
    expect((await create(input("CONFIRMED", { phone: "" }))).status).toBe(400)
    expect((await create(input("CONFIRMED", { birthDate: "2000-02-30" }))).status).toBe(400)
    expect(
      (await create(input("CONFIRMED", { terms: [{ termId: "foreign", status: "CONFIRMED" }] })))
        .status,
    ).toBe(400)
    expect((await create(input("CONFIRMED", { terms: [] }))).status).toBe(400)
    expect(
      (
        await create(
          input("CONFIRMED", {
            terms: [
              { termId: termIds[0], status: "CONFIRMED" },
              { termId: termIds[0], status: "WAITLISTED" },
            ],
          }),
        )
      ).status,
    ).toBe(400)
  })

  it("creates an application only for the second term without enrolling in the first", async () => {
    const response = await create(
      input("CONFIRMED", { terms: [{ termId: termIds[1], status: "CONFIRMED" }] }),
    )
    expect(response.status).toBe(201)
    const created = (await response.json()) as Created
    const application = await prisma.application.findUniqueOrThrow({
      where: { id: created.applicationId },
      include: { terms: { include: { statusChanges: true } } },
    })
    expect(application.terms).toHaveLength(1)
    expect(application.terms[0]).toMatchObject({
      termId: termIds[1],
      status: "CONFIRMED",
      priceCzk: 5600,
      statusChanges: [expect.objectContaining({ changedById: organizerId })],
    })
    const history = await fetch(api(`/organizer/applications/${created.applicationId}/terms`), {
      headers: { Cookie: cookie },
    })
    expect(await history.json()).toEqual([
      expect.objectContaining({ termId: termIds[1], status: "CONFIRMED" }),
    ])
  })

  it("stores the selected statuses, phone and organizer creation history, and gives the applicant an account", async () => {
    const body = input("CONFIRMED")
    const response = await create(body)
    expect(response.status).toBe(201)
    const created = (await response.json()) as Created
    const application = await prisma.application.findUniqueOrThrow({
      where: { id: created.applicationId },
      include: {
        user: true,
        terms: { orderBy: { term: { number: "asc" } }, include: { statusChanges: true } },
      },
    })
    expect(application.phone).toBe("+420777123456")
    expect(application.user?.mustSetPassword).toBe(true)
    expect(application.terms.map((term) => [term.status, term.priceCzk])).toEqual([
      ["CONFIRMED", 4900],
      ["WAITLISTED", 5600],
    ])
    expect(
      application.terms.every((term) => term.statusChanges[0]?.changedById === organizerId),
    ).toBe(true)
    const history = await fetch(api(`/organizer/applications/${created.applicationId}/terms`), {
      headers: { Cookie: cookie },
    })
    expect(((await history.json()) as { history: { kind: string }[] }[])[0].history[0].kind).toBe(
      "CREATED_BY_ORGANIZER",
    )
  })

  it("requires conscious confirmation over capacity and permits choosing waitlist instead", async () => {
    const over = input("CONFIRMED")
    const rejected = await create(over)
    expect(rejected.status).toBe(409)
    expect(((await rejected.json()) as { code: string }).code).toBe("CAPACITY_EXCEEDED")
    const email = (over as { email: string }).email
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull()
    expect(await prisma.application.count({ where: { email } })).toBe(0)
    // The rejected contact can still submit a waitlisted application and receive access.
    expect(
      (
        await create({
          ...over,
          terms: termIds.map((termId) => ({ termId, status: "WAITLISTED" })),
        })
      ).status,
    ).toBe(201)
    expect((await create(input("WAITLISTED"))).status).toBe(201)
    expect((await create(input("CONFIRMED", { confirmOverCapacity: true }))).status).toBe(201)
  })

  it("rejects the same participant on the same term", async () => {
    const first = input("WAITLISTED") as Record<string, unknown>
    expect((await create(first)).status).toBe(201)
    const duplicate = { ...first, email: "another@example.com" }
    expect((await create(duplicate)).status).toBe(409)
  })

  it.each(["       ", "-------", "( ) - ( )", "123 456", "+"])(
    "rejects a phone without at least seven digits: %j",
    async (phone) => {
      expect((await create(input("WAITLISTED", { phone }))).status).toBe(400)
    },
  )
})
