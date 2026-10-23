// US-25: the page after sending is reached by the secret access token and shows every
// participant of the submission, never a place in the queue.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed } from "@/test/integration/test-api"

type Gender = "FEMALE" | "MALE"
type StatusBody = {
  email: string
  isNewAccount: boolean
  applications: {
    firstName: string
    code: string
    variableSymbol: string
    terms: { status: string }[]
    paymentStatus: string
    payment: { amountCzk: number; bankAccount: string; variableSymbol: string } | null
  }[]
}

describe("submission status (integration)", () => {
  let prisma: PrismaService
  let publicToken: string
  let termIds: string[]
  let counter = 0

  const participant = (firstName: string, gender: Gender, terms: string[]): object => ({
    firstName,
    lastName: "Test",
    birthDate: "2014-05-18",
    gender,
    termIds: terms,
  })

  const submit = async (participants: object[]): Promise<{ accessToken: string }> => {
    const response = await fetch(api(`/public/events/${publicToken}/applications`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `status-${++counter}@example.com`,
        consent: true,
        participants,
      }),
    })
    expect(response.status).toBe(201)
    return response.json()
  }

  const status = (accessToken: string): Promise<Response> =>
    fetch(api(`/public/applications/${accessToken}`))

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    const organization = await prisma.organization.findFirstOrThrow()
    publicToken = "us-25-event"
    const event = await prisma.event.create({
      data: {
        organizationId: organization.id,
        name: "US-25",
        publicToken,
        // One women's bed and one men's bed in every term.
        rooms: {
          create: [
            { organizationId: organization.id, name: "A", capacity: 1, gender: "FEMALE" },
            { organizationId: organization.id, name: "B", capacity: 1, gender: "MALE" },
          ],
        },
        terms: {
          create: ["T1", "T2"].map((name, index) => ({
            organizationId: organization.id,
            name,
            startsOn: new Date(`2027-07-0${index + 1}`),
            endsOn: new Date(`2027-07-0${index + 2}`),
            priceCzk: 1000 * (index + 1),
          })),
        },
      },
      include: { terms: { orderBy: { name: "asc" } } },
    })
    termIds = event.terms.map((term) => term.id)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("returns every participant of the submission and what each of them pays, without auth", async () => {
    const [t1, t2] = termIds
    const { accessToken } = await submit([
      participant("Jana", "FEMALE", [t1]),
      participant("Matěj", "MALE", [t1, t2]),
    ])

    const response = await status(accessToken)
    const body = (await response.json()) as StatusBody

    expect(response.status).toBe(200)
    expect(body.isNewAccount).toBe(true)
    expect(body.applications.map((a) => a.firstName)).toEqual(["Jana", "Matěj"])
    expect(body.applications.map((a) => a.payment)).toEqual([
      { amountCzk: 1000, bankAccount: "2900123456/2010", variableSymbol: expect.any(String) },
      { amountCzk: 3000, bankAccount: "2900123456/2010", variableSymbol: expect.any(String) },
    ])
    // Every application pays under its own variable symbol; nothing is summed.
    const [jana, matej] = body.applications
    expect(jana.payment?.variableSymbol).toBe(jana.variableSymbol)
    expect(matej.payment?.variableSymbol).toBe(matej.variableSymbol)
    expect(jana.variableSymbol).not.toBe(matej.variableSymbol)
    expect(jana.paymentStatus).toBe("UNPAID")
    expect(jana.code).toMatch(/^U-\d{4}$/)
  })

  it("opens from the token of any participant and does not mix in other submissions", async () => {
    const [, t2] = termIds
    const first = await submit([participant("Eva", "FEMALE", [t2])])
    await submit([participant("Jiná", "MALE", [t2])])
    const own = (await (await status(first.accessToken)).json()) as StatusBody
    expect(own.applications.map((a) => a.firstName)).toEqual(["Eva"])
  })

  it("shows no payment details and no queue position when everything is waitlisted", async () => {
    const [t1] = termIds
    // The women's bed of T1 is taken by Jana above.
    const { accessToken } = await submit([participant("Zuzana", "FEMALE", [t1])])

    const raw = await (await status(accessToken)).text()
    const body = JSON.parse(raw) as StatusBody

    expect(body.applications[0].terms.map((t) => t.status)).toEqual(["WAITLISTED"])
    expect(body.applications[0].payment).toBeNull()
    expect(body.applications[0].paymentStatus).toBe("NOTHING_DUE")
    expect(raw).not.toMatch(/position|queue|order/i)
  })

  it("answers an unknown token with 404 and the NOT_FOUND code", async () => {
    const response = await status("unknown-token")

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ statusCode: 404, code: "NOT_FOUND" })
  })
})
