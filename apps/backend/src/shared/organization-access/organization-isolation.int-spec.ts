// #331 (OWASP A01): every organizer endpoint that reads or changes organization data,
// called by an organizer of another organization. Each one answers 403 with no content
// and leaves the data of the organization as it was. The table of endpoints is in
// docs/SECURITY-REPORT.md, „Řízení přístupu po endpointech“.
import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Call = { method: string; path: string; body?: unknown; raw?: Buffer }

const FORBIDDEN = { statusCode: 403, code: "FORBIDDEN", message: "Forbidden" }
/** Smallest valid PNG: the photo upload reads the bytes, not the header. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
)

describe("organization isolation of organizer endpoints (integration)", () => {
  let prisma: PrismaService
  let foreignCookie: string
  let organizationId: string
  /** Data of „Letní kemp z. s.“, the organization of organizator@example.com. */
  let ids: {
    event: string
    term: string
    room: string
    application: string
    receipt: string
    request: string
  }

  const send = (cookie: string, { method, path, body, raw }: Call): Promise<Response> =>
    fetch(api(path), {
      method,
      headers: {
        Cookie: cookie,
        ...(raw ? { "Content-Type": "image/png" } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: raw ? new Uint8Array(raw) : body === undefined ? undefined : JSON.stringify(body),
    })

  /** Everything the endpoints below could read or write, for the organization. */
  const snapshot = async (): Promise<string> => {
    const where = { organizationId }
    return JSON.stringify(
      await Promise.all([
        prisma.event.findMany({ where, orderBy: { id: "asc" } }),
        prisma.eventPhoto.findMany({ where: { event: where }, orderBy: { eventId: "asc" } }),
        prisma.term.findMany({ where, orderBy: { id: "asc" } }),
        prisma.room.findMany({ where, orderBy: { id: "asc" } }),
        prisma.application.findMany({ where, orderBy: { id: "asc" } }),
        prisma.applicationTerm.findMany({ where, orderBy: { id: "asc" } }),
        prisma.applicationTermStatusChange.findMany({ where, orderBy: { id: "asc" } }),
        prisma.payment.findMany({ where, orderBy: { id: "asc" } }),
        prisma.changeRequest.findMany({ where, orderBy: { id: "asc" } }),
      ]),
    )
  }

  /** Every organizer endpoint that takes an id of organization data (controllers under modules/). */
  const organizerCalls = (): Call[] => {
    const { event, term, room, application, receipt, request } = ids
    const e = `/organizer/events/${event}`
    const t = `${e}/terms/${term}`
    const a = `/organizer/applications/${application}`
    const termBody = { startsOn: "2027-07-01", endsOn: "2027-07-05", priceCzk: 1000 }
    return [
      // events
      { method: "POST", path: "/organizer/events", body: { organizationId, name: "Foreign" } },
      { method: "GET", path: e },
      { method: "PUT", path: `${e}/public-page`, body: { name: "X", publishedInCatalog: false } },
      { method: "PUT", path: `${e}/photo`, raw: PNG },
      { method: "GET", path: `${e}/photo` },
      { method: "DELETE", path: `${e}/photo` },
      { method: "PATCH", path: `${e}/evaluation-mode`, body: { evaluationMode: "MANUAL" } },
      { method: "PUT", path: `${e}/cancellation-start`, body: { cancellationStartsOn: null } },
      { method: "DELETE", path: e },
      // terms
      { method: "GET", path: `${e}/terms` },
      { method: "POST", path: `${e}/terms`, body: termBody },
      { method: "PATCH", path: t, body: termBody },
      { method: "POST", path: `${t}/cancel`, body: { reason: "Foreign" } },
      // transport
      { method: "GET", path: `${e}/transport` },
      {
        method: "POST",
        path: `${e}/transport`,
        body: {
          termId: term,
          kind: "SCHEDULED",
          name: "X",
          departurePlace: "Y",
          departureAt: "2027-07-12T06:00:00.000Z",
        },
      },
      {
        method: "PUT",
        path: `${e}/transport/none`,
        body: { name: "X", departurePlace: "Y", departureAt: "2027-07-12T06:00:00.000Z" },
      },
      { method: "DELETE", path: `${e}/transport/none` },
      { method: "GET", path: `${e}/transport/none/participants` },
      // rooms
      { method: "GET", path: `${t}/rooms` },
      { method: "PATCH", path: `${t}/room-mode`, body: { roomMode: "SHARED" } },
      { method: "POST", path: `${t}/rooms`, body: { name: "X", capacity: 1, gender: null } },
      { method: "PUT", path: `${t}/rooms/${room}`, body: { name: "X", capacity: 1, gender: null } },
      { method: "DELETE", path: `${t}/rooms/${room}` },
      // capacity, overview
      { method: "GET", path: `${e}/capacity` },
      { method: "GET", path: `${e}/capacity/details` },
      { method: "GET", path: `${e}/applications` },
      { method: "GET", path: `${e}/occupancy` },
      // change requests
      { method: "GET", path: `${e}/change-requests` },
      { method: "GET", path: `${e}/change-requests/${request}` },
      { method: "PATCH", path: `${e}/change-requests/${request}/approve` },
      { method: "PATCH", path: `${e}/change-requests/${request}/reject`, body: { reason: "X" } },
      // bulk actions and substitutes of a term
      {
        method: "POST",
        path: `${t}/bulk-confirmation/preview`,
        body: { applicationIds: [application] },
      },
      { method: "POST", path: `${t}/bulk-confirmation`, body: { applicationIds: [application] } },
      {
        method: "POST",
        path: `${t}/bulk-decision`,
        body: { decision: "WAITLIST", applicationIds: [application] },
      },
      { method: "GET", path: `${t}/substitutes` },
      { method: "GET", path: `${t}/substitutes/history` },
      { method: "POST", path: `${t}/substitutes/${application}/confirm` },
      // terms and status of an application
      { method: "GET", path: `${a}/terms` },
      { method: "GET", path: `${a}/terms/change-options` },
      { method: "GET", path: `${a}/terms/change-preview?termIds=${term}` },
      { method: "PUT", path: `${a}/terms`, body: { termIds: [term] } },
      { method: "PATCH", path: `${a}/terms/${term}/status`, body: { status: "CANCELLED" } },
      // payments
      { method: "GET", path: `${a}/payments` },
      { method: "POST", path: `${a}/payments`, body: { requestId: randomUUID(), amountCzk: 100 } },
      {
        method: "POST",
        path: `${a}/payments/refunds`,
        body: { requestId: randomUUID(), amountCzk: 100, termId: term },
      },
      { method: "POST", path: `${a}/payments/${receipt}/preview`, body: { amountCzk: 100 } },
      {
        method: "PATCH",
        path: `${a}/payments/${receipt}`,
        body: { requestId: randomUUID(), amountCzk: 100 },
      },
      { method: "DELETE", path: `${a}/payments/${receipt}` },
    ]
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    foreignCookie = await signIn("organizator2@example.com", "password2")

    const participant = await prisma.user.findUniqueOrThrow({
      where: { email: "ucastnik@example.com" },
    })
    // The paid application of the seed participant in „Letní kemp 2027“.
    const payment = await prisma.payment.findFirstOrThrow({
      where: { cancelledAt: null, applicationTerm: { application: { userId: participant.id } } },
      include: { applicationTerm: { include: { application: true } } },
    })
    const { application } = payment.applicationTerm
    organizationId = application.organizationId
    const term = payment.applicationTerm.termId
    const room =
      (await prisma.room.findFirst({ where: { termId: term } })) ??
      (await prisma.room.create({
        data: { organizationId, termId: term, name: "Isolation", capacity: 1 },
      }))
    const request = await prisma.changeRequest.create({
      data: {
        organizationId,
        eventId: application.eventId,
        applicationId: application.id,
        applicantId: participant.id,
        currentTermIds: [term],
        requestedTermIds: [],
      },
    })
    ids = {
      event: application.eventId,
      term,
      room: room.id,
      application: application.id,
      receipt: payment.receiptId,
      request: request.id,
    }
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("covers organization data of another organizer than the one signing in", async () => {
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator2@example.com" },
      include: { memberships: true },
    })
    expect(organizer.memberships.map((m) => m.organizationId)).not.toContain(organizationId)
  })

  it("answers 403 with no content to every endpoint and changes nothing", async () => {
    const before = await snapshot()
    const answers: string[] = []
    for (const call of organizerCalls()) {
      const response = await send(foreignCookie, call)
      const body = await response.json().catch(() => null)
      if (response.status !== 403 || JSON.stringify(body) !== JSON.stringify(FORBIDDEN))
        answers.push(`${call.method} ${call.path} → ${response.status} ${JSON.stringify(body)}`)
    }
    expect(answers).toEqual([])
    expect(await snapshot()).toBe(before)
  })

  it("leaves the foreign event out of the organizer's list", async () => {
    const response = await send(foreignCookie, { method: "GET", path: "/organizer/events" })
    const events = (await response.json()) as { id: string }[]

    expect(response.status).toBe(200)
    expect(events.map((event) => event.id)).not.toContain(ids.event)
  })

  describe("a foreign id under the organizer's own event or application", () => {
    let own: { event: string; term: string; application: string; gender: string | null }

    beforeAll(async () => {
      const organizer = await prisma.user.findUniqueOrThrow({
        where: { email: "organizator2@example.com" },
        include: { memberships: true },
      })
      const application = await prisma.applicationTerm.findFirstOrThrow({
        where: { organizationId: { in: organizer.memberships.map((m) => m.organizationId) } },
        include: { application: true, term: true },
      })
      own = {
        event: application.application.eventId,
        term: application.termId,
        application: application.applicationId,
        gender: application.term.roomMode === "GENDERED" ? "FEMALE" : null,
      }
    })

    // A child id that is not of the parent answers like an unknown one: 403, or 404 where the
    // endpoint says so for an unknown term (substitutes, status of an application in a term).
    it("answers 403 or 404 with no content and changes nothing", async () => {
      const { term, room, request, receipt } = ids
      const e = `/organizer/events/${own.event}`
      const a = `/organizer/applications/${own.application}`
      const termBody = { startsOn: "2027-07-01", endsOn: "2027-07-05", priceCzk: 1000 }
      const calls: Call[] = [
        { method: "PATCH", path: `${e}/terms/${term}`, body: termBody },
        { method: "POST", path: `${e}/terms/${term}/cancel`, body: { reason: "Foreign" } },
        { method: "GET", path: `${e}/terms/${term}/rooms` },
        { method: "PATCH", path: `${e}/terms/${term}/room-mode`, body: { roomMode: "SHARED" } },
        {
          method: "PUT",
          path: `${e}/terms/${own.term}/rooms/${room}`,
          body: { name: "X", capacity: 1, gender: own.gender },
        },
        { method: "DELETE", path: `${e}/terms/${own.term}/rooms/${room}` },
        { method: "GET", path: `${e}/change-requests/${request}` },
        { method: "PATCH", path: `${e}/change-requests/${request}/approve` },
        { method: "PATCH", path: `${e}/change-requests/${request}/reject`, body: {} },
        { method: "GET", path: `${e}/terms/${term}/substitutes` },
        { method: "GET", path: `${e}/terms/${term}/substitutes/history` },
        { method: "PATCH", path: `${a}/terms/${term}/status`, body: { status: "CANCELLED" } },
        { method: "POST", path: `${a}/payments/${receipt}/preview`, body: { amountCzk: 100 } },
        { method: "DELETE", path: `${a}/payments/${receipt}` },
      ]
      const before = await snapshot()
      const answers: string[] = []
      for (const call of calls) {
        const response = await send(foreignCookie, call)
        const body = (await response.json()) as Record<string, unknown>
        if (![403, 404].includes(response.status) || Object.keys(body).length !== 3)
          answers.push(`${call.method} ${call.path} → ${response.status} ${JSON.stringify(body)}`)
      }
      expect(answers).toEqual([])
      expect(await snapshot()).toBe(before)
    })

    it("leaves foreign applications of a bulk action unchanged", async () => {
      const t = `${`/organizer/events/${own.event}`}/terms/${own.term}`
      const before = await snapshot()
      for (const [path, body] of [
        [`${t}/bulk-confirmation`, { applicationIds: [ids.application] }],
        [`${t}/bulk-decision`, { decision: "WAITLIST", applicationIds: [ids.application] }],
      ] as const) {
        const response = await send(foreignCookie, { method: "POST", path, body })
        if (response.ok) expect((await response.json()).unchanged).toEqual([ids.application])
        else expect(response.status).toBeGreaterThanOrEqual(400)
      }
      expect(await snapshot()).toBe(before)
    })
  })
})
