import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("organizer changes the terms of an application (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let foreignCookie: string
  let applicationId: string
  let firstId: string
  let secondId: string
  let fullId: string
  let organizationId: string

  const url = (suffix = ""): string =>
    api(`/organizer/applications/${applicationId}/terms${suffix}`)
  const preview = (termIds: string[], auth = cookie): Promise<Response> =>
    fetch(url(`/change-preview?termIds=${termIds.join(",")}`), { headers: { Cookie: auth } })
  const change = (
    termIds: string[],
    confirmOverCapacity?: boolean,
    auth = cookie,
  ): Promise<Response> =>
    fetch(url(), {
      method: "PUT",
      headers: { Cookie: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ termIds, confirmOverCapacity }),
    })

  const term = (number: number, price: number, capacity: number, startsOn: string) => ({
    organizationId,
    number,
    name: `T${number}`,
    startsOn: new Date(startsOn),
    endsOn: new Date(startsOn),
    priceCzk: price,
    rooms: { create: [{ organizationId, name: "R", capacity, gender: "MALE" as const }] },
  })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    const organization = await prisma.organization.findFirstOrThrow({
      where: { name: "Letní kemp z. s." },
    })
    organizationId = organization.id
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
    })
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: "US-33 organizer change",
        publicToken: `us33-${randomUUID()}`,
        terms: {
          create: [
            term(1, 1000, 2, "2027-07-01"),
            term(2, 2000, 2, "2027-07-08"),
            term(3, 3000, 1, "2027-07-15"),
          ],
        },
      },
      include: { terms: { orderBy: { number: "asc" } } },
    })
    ;[firstId, secondId, fullId] = event.terms.map((row) => row.id)
    const person = (firstName: string) => ({
      organizationId,
      eventId: event.id,
      accessToken: randomUUID(),
      firstName,
      lastName: "Test",
      birthDate: new Date(`2010-01-0${firstName === "Adam" ? 1 : 2}`),
      gender: "MALE" as const,
      email: `${firstName.toLowerCase()}@example.com`,
      consentAt: new Date(),
    })
    const application = await prisma.application.create({
      data: {
        ...person("Adam"),
        terms: {
          create: [{ organizationId, termId: firstId, status: "CONFIRMED", priceCzk: 1000 }],
        },
      },
      include: { terms: true },
    })
    applicationId = application.id
    await prisma.payment.create({
      data: {
        organizationId,
        applicationTermId: application.terms[0].id,
        receiptId: randomUUID(),
        amountCzk: 1000,
        recordedById: organizer.id,
      },
    })
    // Somebody else fills the one bed of the third term.
    await prisma.application.create({
      data: {
        ...person("Boris"),
        terms: {
          create: [{ organizationId, termId: fullId, status: "CONFIRMED", priceCzk: 3000 }],
        },
      },
    })
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("rejects a foreign organization and a missing session", async () => {
    expect((await preview([secondId], foreignCookie)).status).toBe(403)
    expect((await change([secondId], undefined, foreignCookie)).status).toBe(403)
    expect((await fetch(url())).status).toBe(401)
  })

  it("lists the terms of the event with the ones the application is in", async () => {
    const response = await fetch(url("/change-options"), { headers: { Cookie: cookie } })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject([
      { id: firstId, selected: true },
      { id: secondId, selected: false },
      { id: fullId, selected: false },
    ])
  })

  it("previews the impact without writing", async () => {
    const response = await preview([secondId])
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      newPriceCzk: 2000,
      amountToPayCzk: 2000,
      overpaymentCzk: 1000,
      added: [{ termId: secondId, fits: true, genderCapacity: 2, genderFree: 2 }],
      removed: [{ termId: firstId, paidCzk: 1000, overpaymentCzk: 1000 }],
    })
    expect(await prisma.applicationTerm.count({ where: { applicationId } })).toBe(1)
  })

  it("does not confirm a full term without the conscious confirmation", async () => {
    expect((await (await preview([fullId])).json()).added[0]).toMatchObject({ fits: false })
    const refused = await change([fullId])
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ code: "CAPACITY_EXCEEDED" })
    expect(
      await prisma.applicationTerm.count({ where: { applicationId, status: "CONFIRMED" } }),
    ).toBe(1)
  })

  it("changes the term, keeps the payment and logs the organizer", async () => {
    const response = await change([secondId])
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ changed: true })
    const rows = await prisma.applicationTerm.findMany({
      where: { applicationId },
      include: { payments: true },
    })
    expect(rows.find((row) => row.termId === firstId)).toMatchObject({
      status: "CANCELLED",
      payments: [{ amountCzk: 1000 }],
    })
    expect(rows.find((row) => row.termId === secondId)).toMatchObject({
      status: "CONFIRMED",
      priceCzk: 2000,
      payments: [],
    })
    const log = await prisma.applicationTermStatusChange.findFirstOrThrow({
      where: { applicationTerm: { applicationId, termId: firstId } },
      include: { changedBy: true },
    })
    expect(log).toMatchObject({ fromStatus: "CONFIRMED", toStatus: "CANCELLED" })
    expect(log.changedBy?.email).toBe("organizator@example.com")
  })

  it("is a no-op when the selection does not change", async () => {
    expect(await (await change([secondId])).json()).toMatchObject({ changed: false })
  })

  it("confirms a full term over its capacity once the organizer confirms", async () => {
    const response = await change([fullId], true)
    expect(response.status).toBe(200)
    expect(
      await prisma.applicationTerm.count({ where: { termId: fullId, status: "CONFIRMED" } }),
    ).toBe(2)
  })
})
