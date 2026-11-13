import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("attention overview API (US-51)", () => {
  let prisma: PrismaService
  let cookie: string
  let eventId: string
  const get = (path: string, session = cookie, id = eventId) =>
    fetch(api(`/organizer/events/${id}${path}`), { headers: { Cookie: session } })

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

  it("matches the filtered applications list, the payments overview and the pending requests", async () => {
    const attention = await (await get("/attention")).json()
    const toEvaluate = await (await get("/applications?status=TO_EVALUATE")).json()
    const debtors = await (await get("/applications?payment=DEBT")).json()
    const payments = await (await get("/payments")).json()
    const requests = await (await get("/change-requests")).json()

    expect(attention.toEvaluateCount).toBe(toEvaluate.length)
    expect(attention.debt.debtorCount).toBe(debtors.length)
    expect(attention.debt).toEqual({
      debtorCount: payments.debtorCount,
      overdueCount: payments.overdueCount,
      totalDebtCzk: payments.totalDebtCzk,
    })
    expect(attention.changeRequestCount).toBe(requests.length)
    expect(attention.debt.debtorCount).toBeGreaterThan(0)
  })

  it("counts approvable substitutes like the filtered list: a free bed, in either evaluation mode", async () => {
    // The seed has no waitlist here: one confirmed applicant waits instead, so their bed is free.
    const waitlisted = await prisma.applicationTerm.findFirstOrThrow({
      where: { status: "CONFIRMED", application: { eventId } },
    })
    await prisma.applicationTerm.update({
      where: { id: waitlisted.id },
      data: { status: "WAITLISTED" },
    })
    // A free bed nobody filled (a bigger capacity) is the organizer's to fill in both modes (US-31).
    expect((await (await get("/attention")).json()).substituteCount).toBeGreaterThan(0)

    await prisma.event.update({ where: { id: eventId }, data: { evaluationMode: "MANUAL" } })
    const attention = await (await get("/attention")).json()
    const approvable = await (await get("/applications?waitlist=FREE_BED")).json()
    expect(attention.substituteCount).toBe(approvable.length)
    expect(attention.substituteCount).toBeGreaterThan(0)
    // The card links with both filters (#397): the list it opens has the rows the card counts.
    const cardList = await (await get("/applications?status=WAITLISTED&waitlist=FREE_BED")).json()
    expect(cardList.map((row: { id: string }) => row.id).sort()).toEqual(
      approvable.map((row: { id: string }) => row.id).sort(),
    )
    expect(approvable.map((row: { id: string }) => row.id)).toContain(waitlisted.applicationId)
  })

  it("is for organizers of the event only", async () => {
    expect((await get("/attention", "")).status).toBe(401)
    expect(
      (await get("/attention", await signIn("ucastnik@example.com", "password4"))).status,
    ).toBe(403)
    expect((await get("/attention", cookie, "does-not-exist")).status).toBe(403)
  })
})
