import { PrismaService } from "@/core/prisma/prisma.service"
import { variableSymbol } from "@/modules/applications/domain/variable-symbol"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("application list API", () => {
  let prisma: PrismaService
  let cookie: string
  let eventId: string
  const get = (query = "", session = cookie, id = eventId): Promise<Response> =>
    fetch(api(`/organizer/events/${id}/applications${query}`), { headers: { Cookie: session } })
  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    eventId = (
      await prisma.event.findUniqueOrThrow({ where: { publicToken: "demo-letni-kemp-2027" } })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("returns personal details, frozen prices and stable newest-first ordering", async () => {
    const response = await get()
    expect(response.status).toBe(200)
    const rows = await response.json()
    const source = await prisma.application.findMany({
      where: { eventId },
      orderBy: [{ submittedAt: "desc" }, { number: "desc" }],
    })
    expect(rows.map((row: { id: string }) => row.id)).toEqual(source.map((row) => row.id))
    expect(rows[0]).toMatchObject({
      firstName: source[0].firstName,
      lastName: source[0].lastName,
      birthDate: source[0].birthDate.toISOString().slice(0, 10),
      email: source[0].email,
      gender: source[0].gender,
    })
    expect(rows[0].terms.length).toBeGreaterThan(0)
    expect(rows[0].amountOwedCzk).toBe(rows[0].amountDueCzk - rows[0].amountPaidCzk)
  })

  it("combines term, status, gender and payment without losing other terms", async () => {
    const source = await prisma.application.findFirstOrThrow({
      where: {
        eventId,
        AND: [
          { terms: { some: { status: "CONFIRMED" } } },
          { terms: { none: { payments: { some: {} } } } },
        ],
      },
      include: { terms: true },
    })
    const term = source.terms.find((term) => term.status === "CONFIRMED")!
    const rows = await (
      await get(`?termId=${term.termId}&status=CONFIRMED&gender=${source.gender}&payment=UNPAID`)
    ).json()
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.gender).toBe(source.gender)
      expect(row.paymentStatus).toBe("UNPAID")
      expect(row.terms).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: term.termId, status: "CONFIRMED" })]),
      )
    }
    expect(await (await get("?termId=missing")).json()).toEqual([])
  })

  it("numbers the waitlist of a term per gender in the order applications were received", async () => {
    // The full demo camp has waitlisted applicants of both genders.
    const fullCamp = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-letni-kemp-plny" },
    })
    const waiting = await prisma.applicationTerm.findFirstOrThrow({
      where: { status: "WAITLISTED", application: { eventId: fullCamp.id } },
    })
    const rows = (await (
      await get(`?termId=${waiting.termId}&status=WAITLISTED`, cookie, fullCamp.id)
    ).json()) as {
      id: string
      gender: string
      submittedAt: string
      terms: { id: string; status: string; waitlistPosition: number | null }[]
    }[]
    expect(rows.length).toBeGreaterThan(0)
    for (const gender of ["FEMALE", "MALE"]) {
      const group = rows.filter((row) => row.gender === gender)
      const positions = group.map(
        (row) => row.terms.find((term) => term.id === waiting.termId)!.waitlistPosition,
      )
      expect(positions).toEqual(group.map((_, index) => index + 1))
      const times = group.map((row) => Date.parse(row.submittedAt))
      expect(times).toEqual([...times].sort((a, b) => a - b))
    }
    // Filtering by gender never renumbers the queue.
    const women = await (
      await get(`?termId=${waiting.termId}&status=WAITLISTED&gender=FEMALE`, cookie, fullCamp.id)
    ).json()
    expect(women.map((row: { id: string }) => row.id)).toEqual(
      rows.filter((row) => row.gender === "FEMALE").map((row) => row.id),
    )
  })

  it("filters on applications with no amount due, which the full camp has as waitlisted ones", async () => {
    // Only waitlisted terms: nothing is due until a place is confirmed.
    const fullCamp = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-letni-kemp-plny" },
    })
    const rows = (await (await get("?payment=NOTHING_DUE", cookie, fullCamp.id)).json()) as {
      paymentStatus: string
    }[]
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.paymentStatus === "NOTHING_DUE")).toBe(true)
  })

  it("validates filters and protects organization data", async () => {
    for (const query of [
      "?payment=OTHER",
      "?status=OTHER",
      "?gender=OTHER",
      `?q=${"a".repeat(101)}`,
    ])
      expect((await get(query)).status).toBe(400)
    expect((await get("", "")).status).toBe(401)
    expect((await get("", await signIn("ucastnik@example.com", "password4"))).status).toBe(403)
    const foreign = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-horsky-vikend-2027" },
    })
    const response = await get("", cookie, foreign.id)
    expect(response.status).toBe(403)
    expect(await response.text()).not.toContain(foreign.name)
    expect((await get("", cookie, "missing")).status).toBe(403)
  })

  it("searches names, e-mails and variable symbols only within the authorized event", async () => {
    const source = await prisma.application.findFirstOrThrow({ where: { eventId } })
    for (const q of [
      `${source.lastName} ${source.firstName}`,
      source.email.toUpperCase(),
      variableSymbol(source.number),
    ]) {
      const response = await get(`?q=${encodeURIComponent(q)}`)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: source.id })]),
      )
    }
    expect(await (await get("?q=no-such-participant-xyz")).json()).toEqual([])
    const foreign = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-horsky-vikend-2027" },
    })
    expect((await get(`?q=${encodeURIComponent(source.email)}`, cookie, foreign.id)).status).toBe(
      403,
    )
  })

  it("lists the applications to evaluate from the oldest (US-103)", async () => {
    const manual = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-rucni-vyhodnoceni-2028" },
      include: { terms: true },
    })
    const [term] = manual.terms
    const submit = (firstName: string, submittedAt: string) =>
      prisma.application.create({
        data: {
          organizationId: manual.organizationId,
          eventId: manual.id,
          accessToken: `us-103-${firstName}`,
          firstName,
          lastName: "Fronta",
          birthDate: new Date("2012-05-12"),
          gender: "FEMALE",
          email: `${firstName}@example.com`,
          consentAt: new Date(submittedAt),
          locale: "cs",
          submittedAt: new Date(submittedAt),
          terms: {
            create: [
              {
                organizationId: manual.organizationId,
                termId: term.id,
                status: "TO_EVALUATE",
                priceCzk: 1800,
              },
            ],
          },
        },
      })
    await submit("Druha", "2027-03-10T09:13:00Z")
    await submit("Prvni", "2027-03-10T09:12:00Z")

    const rows = await (await get("?status=TO_EVALUATE", cookie, manual.id)).json()
    expect(rows.map((row: { firstName: string }) => row.firstName)).toEqual(["Prvni", "Druha"])
    const filtered = await (
      await get(`?status=TO_EVALUATE&termId=${term.id}&q=druha`, cookie, manual.id)
    ).json()
    expect(filtered.map((row: { firstName: string }) => row.firstName)).toEqual(["Druha"])
    expect(await (await get("?status=TO_EVALUATE")).json()).toEqual([])
  })
})
