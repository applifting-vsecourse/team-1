import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { TermCapacity } from "@/modules/applications/domain/event-capacity"
import {
  api,
  connectTestPrisma,
  latestEmailTo,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

describe("organizer withdraws a participant (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let foreignCookie: string
  let organizationId: string
  let organizerId: string
  let participantId: string
  let eventId: string
  let firstId: string
  let secondId: string
  let counter = 0

  const url = (applicationId: string, suffix: string): string =>
    api(`/organizer/applications/${applicationId}/terms/${suffix}`)
  const preview = (applicationId: string, termIds: string[], auth = cookie): Promise<Response> =>
    fetch(url(applicationId, `withdraw-preview?termIds=${termIds.join(",")}`), {
      headers: { Cookie: auth },
    })
  const withdraw = (applicationId: string, termIds: string[], auth = cookie): Promise<Response> =>
    fetch(url(applicationId, "withdraw"), {
      method: "POST",
      headers: { Cookie: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ termIds }),
    })
  const capacity = async (): Promise<TermCapacity[]> =>
    (await (
      await fetch(api(`/organizer/events/${eventId}/capacity`), { headers: { Cookie: cookie } })
    ).json()) as TermCapacity[]

  /** An application in the two terms; each row is `[status, price, paid]`. */
  const createApplication = async (
    rows: [string, number, number][],
    overrides: { firstName?: string; birthDate?: string; userId?: string } = {},
  ): Promise<{ id: string; email: string }> => {
    counter += 1
    const email = `us32-${counter}-${randomUUID()}@example.com`
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: randomUUID(),
        firstName: overrides.firstName ?? `Adam${counter}`,
        lastName: "Withdrawn",
        birthDate: new Date(overrides.birthDate ?? `2010-02-${String(counter).padStart(2, "0")}`),
        gender: "MALE",
        email,
        consentAt: new Date(),
        userId: overrides.userId,
        terms: {
          create: rows.map(([status, priceCzk], index) => ({
            organizationId,
            termId: index === 0 ? firstId : secondId,
            status: status as "CONFIRMED" | "WAITLISTED",
            priceCzk,
          })),
        },
      },
      include: { terms: true },
    })
    for (const [index, [, , paid]] of rows.entries()) {
      if (paid === 0) continue
      await prisma.payment.create({
        data: {
          organizationId,
          applicationTermId: application.terms.find(
            (row) => row.termId === (index === 0 ? firstId : secondId),
          )!.id,
          receiptId: randomUUID(),
          amountCzk: paid,
          recordedById: organizerId,
        },
      })
    }
    return { id: application.id, email }
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    organizationId = (
      await prisma.organization.findFirstOrThrow({ where: { name: "Letní kemp z. s." } })
    ).id
    organizerId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "organizator@example.com" } })
    ).id
    participantId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
    ).id
    const term = (number: number, price: number, startsOn: string) => ({
      organizationId,
      number,
      name: `T${number}`,
      startsOn: new Date(startsOn),
      endsOn: new Date(startsOn),
      priceCzk: price,
      rooms: { create: [{ organizationId, name: "R", capacity: 3, gender: "MALE" as const }] },
    })
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: "US-32 withdrawal",
        publicToken: `us32-${randomUUID()}`,
        terms: { create: [term(1, 4900, "2027-07-12"), term(2, 3000, "2027-07-19")] },
      },
      include: { terms: { orderBy: { number: "asc" } } },
    })
    eventId = event.id
    ;[firstId, secondId] = event.terms.map((row) => row.id)
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("rejects a foreign organization and a missing session", async () => {
    const { id } = await createApplication([["CONFIRMED", 4900, 0]])
    expect((await preview(id, [firstId], foreignCookie)).status).toBe(403)
    expect((await withdraw(id, [firstId], foreignCookie)).status).toBe(403)
    expect((await fetch(url(id, "withdraw"), { method: "POST" })).status).toBe(401)
    expect((await fetch(url(id, `withdraw-preview?termIds=${firstId}`))).status).toBe(401)
    expect(
      await prisma.applicationTerm.count({ where: { applicationId: id, status: "CANCELLED" } }),
    ).toBe(0)
  })

  it("previews the money per term without writing", async () => {
    const { id } = await createApplication([
      ["CONFIRMED", 4900, 4900],
      ["CONFIRMED", 3000, 1000],
    ])
    const response = await preview(id, [firstId])
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      overpaymentCzk: 4900,
      terms: [
        { termId: firstId, isWithdrawn: true, paidCzk: 4900, debtCzk: 0, overpaymentCzk: 4900 },
        { termId: secondId, isWithdrawn: false, paidCzk: 1000, debtCzk: 2000, overpaymentCzk: 0 },
      ],
    })
    expect(
      await prisma.applicationTerm.count({ where: { applicationId: id, status: "CANCELLED" } }),
    ).toBe(0)
  })

  it("withdraws one term: paid one shows an overpayment, the other term stays, the bed is free, the log and e-mail follow", async () => {
    const before = (await capacity()).find((row) => row.termId === firstId)!.freePlaces.MALE
    const { id, email } = await createApplication(
      [
        ["CONFIRMED", 4900, 4900],
        ["CONFIRMED", 3000, 0],
      ],
      { userId: participantId },
    )
    expect((await capacity()).find((row) => row.termId === firstId)!.freePlaces.MALE).toBe(
      before - 1,
    )

    const response = await withdraw(id, [firstId])
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ changedByName: expect.any(String) })

    const rows = await prisma.applicationTerm.findMany({
      where: { applicationId: id },
      include: { payments: true },
    })
    expect(rows.find((row) => row.termId === firstId)).toMatchObject({
      status: "CANCELLED",
      payments: [{ amountCzk: 4900 }],
    })
    expect(rows.find((row) => row.termId === secondId)?.status).toBe("CONFIRMED")
    expect((await capacity()).find((row) => row.termId === firstId)!.freePlaces.MALE).toBe(before)

    const log = await prisma.applicationTermStatusChange.findMany({
      where: { applicationTerm: { applicationId: id } },
      include: { changedBy: true },
    })
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ fromStatus: "CONFIRMED", toStatus: "CANCELLED" })
    expect(log[0].changedBy?.email).toBe("organizator@example.com")

    expect(await latestEmailTo(email)).toBeDefined()
    expect(
      await prisma.notification.count({ where: { applicationId: id, kind: "CANCELLED" } }),
    ).toBe(1)
  })

  it("withdraws the whole application and keeps the cancelled terms in the history", async () => {
    const { id, email } = await createApplication([
      ["CONFIRMED", 4900, 4900],
      ["CONFIRMED", 3000, 0],
    ])
    const response = await withdraw(id, [firstId, secondId])
    expect(response.status).toBe(200)
    const rows = await prisma.applicationTerm.findMany({ where: { applicationId: id } })
    expect(rows.map((row) => row.status)).toEqual(["CANCELLED", "CANCELLED"])
    expect(
      await prisma.applicationTermStatusChange.count({
        where: { applicationTerm: { applicationId: id }, toStatus: "CANCELLED" },
      }),
    ).toBe(2)
    expect(await latestEmailTo(email)).toBeDefined()
    const list = await fetch(api(`/organizer/events/${eventId}/applications`), {
      headers: { Cookie: cookie },
    })
    expect(list.status).toBe(200)
    expect(JSON.stringify(await list.json())).toContain(id)
  })

  it("withdraws a waitlisted term without a financial impact", async () => {
    const { id } = await createApplication([
      ["WAITLISTED", 4900, 0],
      ["CONFIRMED", 3000, 0],
    ])
    const body = await (await preview(id, [firstId])).json()
    expect(body.terms[0]).toMatchObject({ hasFinancialImpact: false, debtCzk: 0 })
    expect((await withdraw(id, [firstId])).status).toBe(200)
  })

  it("refuses a repeated withdrawal and an empty or foreign selection", async () => {
    const { id } = await createApplication([
      ["CONFIRMED", 4900, 0],
      ["CONFIRMED", 3000, 0],
    ])
    expect((await withdraw(id, [firstId])).status).toBe(200)
    const repeated = await withdraw(id, [firstId])
    expect(repeated.status).toBe(409)
    expect(await repeated.json()).toMatchObject({ code: "INVALID_STATUS_TRANSITION" })
    expect((await preview(id, [firstId])).status).toBe(409)
    expect((await withdraw(id, [])).status).toBe(400)
    expect((await withdraw(id, [randomUUID()])).status).toBe(409)
    expect(
      (
        await prisma.applicationTerm.findFirstOrThrow({
          where: { applicationId: id, termId: secondId },
        })
      ).status,
    ).toBe("CONFIRMED")
  })
})
