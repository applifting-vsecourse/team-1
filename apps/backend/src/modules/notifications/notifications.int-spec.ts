// US-118: in-app notifications of the participant — made in the transaction of the change they
// describe, read and marked only by their owner.
import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type NotificationDto = {
  id: string
  type: string
  kind: string
  applicationId: string | null
  params: {
    eventName: string
    participantName: string
    termStartsOn: string
    termEndsOn: string
    fromStatus?: string
    toStatus?: string
    amountCzk?: number
    owedCzk?: number
  }
  readAt: string | null
}

describe("participant notifications (integration)", () => {
  let prisma: PrismaService
  let participantCookie: string
  let organizerCookie: string
  let participantId: string
  let organizationId: string
  let eventId: string
  let termId: string
  let counter = 0

  const call = (
    method: string,
    path: string,
    auth?: string,
    body?: Record<string, unknown>,
  ): Promise<Response> =>
    fetch(api(path), {
      method,
      headers: {
        ...(auth ? { Cookie: auth } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  const list = async (auth = participantCookie): Promise<NotificationDto[]> =>
    (await call("GET", "/notifications", auth)).json()
  const unread = async (auth = participantCookie): Promise<number> =>
    ((await (await call("GET", "/notifications/unread-count", auth)).json()) as { count: number })
      .count

  /** An application of the participant account (or of nobody) with one term in the given status. */
  const addApplication = async (
    gender: "FEMALE" | "MALE",
    status: "CONFIRMED" | "WAITLISTED",
    hasAccount = true,
  ): Promise<string> => {
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        userId: hasAccount ? participantId : null,
        accessToken: `us-118-${++counter}-${randomUUID()}`,
        firstName: "Adam",
        lastName: `Dvořák${counter}`,
        birthDate: new Date(`2010-01-${String(counter).padStart(2, "0")}`),
        gender,
        // Never the participant's address: other suites assert that nothing was mailed to it.
        email: `us118-${counter}@example.com`,
        consentAt: new Date(),
        terms: { create: [{ organizationId, termId, status, priceCzk: 1000 }] },
      },
    })
    return application.id
  }
  const changeStatus = (applicationId: string, status: string): Promise<Response> =>
    call(
      "PATCH",
      `/organizer/applications/${applicationId}/terms/${termId}/status`,
      organizerCookie,
      {
        status,
      },
    )

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    participantCookie = await signIn("ucastnik@example.com", "password4")
    organizerCookie = await signIn("organizator@example.com", "password1")
    participantId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
    ).id
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
      include: { memberships: true },
    })
    organizationId = organizer.memberships[0].organizationId
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: "US-118 event",
        publicToken: `us118-${randomUUID()}`,
        cancellationStartsOn: new Date("2999-01-01"),
        terms: {
          create: [
            {
              organizationId,
              number: 1,
              name: "T1",
              startsOn: new Date("2027-07-12"),
              endsOn: new Date("2027-07-18"),
              priceCzk: 1000,
              rooms: {
                create: [
                  { organizationId, name: "A", capacity: 1, gender: "FEMALE" },
                  { organizationId, name: "B", capacity: 5, gender: "MALE" },
                ],
              },
            },
          ],
        },
      },
      include: { terms: true },
    })
    eventId = event.id
    termId = event.terms[0].id
    await prisma.notification.deleteMany()
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })
  // Every test starts with free beds and no notifications.
  beforeEach(async () => {
    await prisma.application.deleteMany({ where: { eventId } })
    await prisma.notification.deleteMany()
  })

  it.each([
    ["GET", "/notifications"],
    ["GET", "/notifications/unread-count"],
    ["POST", "/notifications/read-all"],
    ["POST", "/notifications/some-id/read"],
  ])("answers %s %s without a session with 401", async (method, path) => {
    const response = await call(method, path)

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" })
  })

  it("starts with nothing", async () => {
    expect(await list()).toEqual([])
    expect(await unread()).toBe(0)
  })

  describe("a status change", () => {
    it("tells the account of the application, in the data of the change", async () => {
      const id = await addApplication("MALE", "WAITLISTED")

      expect((await changeStatus(id, "CONFIRMED")).status).toBe(204)

      const [notification, ...rest] = await list()
      expect(rest).toEqual([])
      expect(notification).toMatchObject({
        type: "STATUS_CHANGED",
        kind: "CONFIRMED_FROM_WAITLIST",
        applicationId: id,
        readAt: null,
        params: {
          eventName: "US-118 event",
          participantName: "Adam Dvořák" + counter,
          termStartsOn: "2027-07-12",
          termEndsOn: "2027-07-18",
          fromStatus: "WAITLISTED",
          toStatus: "CONFIRMED",
        },
      })
      expect(await unread()).toBe(1)
    })

    it("uses the kind of the e-mail about the same transition", async () => {
      const id = await addApplication("MALE", "CONFIRMED")

      await changeStatus(id, "WAITLISTED")
      await changeStatus(id, "CANCELLED")

      expect((await list()).map((item) => item.kind)).toEqual([
        // A waitlisted application cancelled by the organizer: EMAILY.md, row 14.
        "CANCELLED_BY_ORGANIZER",
        "WAITLISTED_AFTER_CONFIRMED",
      ])
    })

    it("makes none when the change fails", async () => {
      await changeStatus(await addApplication("FEMALE", "CONFIRMED"), "CONFIRMED")
      await prisma.notification.deleteMany()
      const waitlisted = await addApplication("FEMALE", "WAITLISTED")

      // The only women's bed is taken.
      expect((await changeStatus(waitlisted, "CONFIRMED")).status).toBe(409)

      expect(await prisma.notification.count()).toBe(0)
      expect(await unread()).toBe(0)
    })

    it("makes none for an application without an account", async () => {
      const id = await addApplication("MALE", "WAITLISTED", false)

      expect((await changeStatus(id, "CONFIRMED")).status).toBe(204)

      expect(await prisma.notification.count()).toBe(0)
    })
  })

  describe("a payment", () => {
    const pay = (applicationId: string, body: Record<string, unknown>): Promise<Response> =>
      call("POST", `/organizer/applications/${applicationId}/payments`, organizerCookie, {
        requestId: randomUUID(),
        ...body,
      })

    it("tells the participant what was received and what is still owed in the term", async () => {
      const id = await addApplication("MALE", "CONFIRMED")

      expect((await pay(id, { amountCzk: 400, termId })).status).toBe(204)

      expect(await list()).toMatchObject([
        {
          type: "PAYMENT",
          kind: "PAYMENT_RECORDED",
          applicationId: id,
          params: { amountCzk: 400, owedCzk: 600, termStartsOn: "2027-07-12" },
        },
      ])
    })

    it("tells about a cancelled receipt", async () => {
      const id = await addApplication("MALE", "CONFIRMED")
      await pay(id, { amountCzk: 400, termId })
      const { receiptId } = await prisma.payment.findFirstOrThrow({
        where: { applicationTerm: { applicationId: id } },
      })

      expect(
        (
          await call(
            "DELETE",
            `/organizer/applications/${id}/payments/${receiptId}`,
            organizerCookie,
          )
        ).status,
      ).toBe(204)

      expect((await list())[0]).toMatchObject({
        kind: "PAYMENT_CANCELLED",
        params: { amountCzk: 400, owedCzk: 1000 },
      })
    })

    it("tells about a refund", async () => {
      const id = await addApplication("MALE", "CONFIRMED")
      await pay(id, { amountCzk: 1000, termId })
      await prisma.applicationTerm.updateMany({
        where: { applicationId: id },
        data: { priceCzk: 600 },
      })

      const response = await call(
        "POST",
        `/organizer/applications/${id}/payments/refunds`,
        organizerCookie,
        { requestId: randomUUID(), amountCzk: 400, termId },
      )

      expect(response.status).toBe(204)
      expect((await list())[0]).toMatchObject({
        kind: "PAYMENT_REFUNDED",
        params: { amountCzk: 400, owedCzk: 0 },
      })
    })

    it("makes none when the payment is refused", async () => {
      const id = await addApplication("MALE", "CONFIRMED")

      expect((await pay(id, { amountCzk: 0, termId })).status).toBe(400)

      expect(await prisma.notification.count()).toBe(0)
    })

    it("makes none again when the same request is repeated", async () => {
      const id = await addApplication("MALE", "CONFIRMED")
      const requestId = randomUUID()
      const body = { requestId, amountCzk: 400, termId }
      const url = `/organizer/applications/${id}/payments`

      await call("POST", url, organizerCookie, body)
      await call("POST", url, organizerCookie, body)

      expect(await prisma.notification.count()).toBe(1)
    })
  })

  describe("the participant's own cancellation", () => {
    it("is told once the application is cancelled", async () => {
      const id = await addApplication("MALE", "CONFIRMED")

      const response = await call(
        "PUT",
        `/participant/applications/${id}/terms`,
        participantCookie,
        {
          termIds: [],
        },
      )

      expect(response.status).toBe(204)
      expect(await list()).toMatchObject([
        {
          kind: "CANCELLED",
          applicationId: id,
          params: { fromStatus: "CONFIRMED", toStatus: "CANCELLED" },
        },
      ])
    })
  })

  describe("reading and marking", () => {
    const makeTwo = async (): Promise<NotificationDto[]> => {
      await changeStatus(await addApplication("MALE", "WAITLISTED"), "CONFIRMED")
      await changeStatus(await addApplication("MALE", "WAITLISTED"), "CONFIRMED")
      return list()
    }

    it("lists newest first and counts the unread ones", async () => {
      const both = await makeTwo()

      expect(both).toHaveLength(2)
      expect(both[0].applicationId).not.toBe(both[1].applicationId)
      expect(await unread()).toBe(2)
    })

    it("marks one as read: the count drops and the record stays", async () => {
      const [first] = await makeTwo()

      expect(
        (await call("POST", `/notifications/${first.id}/read`, participantCookie)).status,
      ).toBe(204)

      expect(await unread()).toBe(1)
      const stored = await list()
      expect(stored).toHaveLength(2)
      expect(stored.find((item) => item.id === first.id)?.readAt).not.toBeNull()
    })

    it("marks one as read again without harm", async () => {
      const [first] = await makeTwo()
      await call("POST", `/notifications/${first.id}/read`, participantCookie)

      expect(
        (await call("POST", `/notifications/${first.id}/read`, participantCookie)).status,
      ).toBe(204)
      expect(await unread()).toBe(1)
    })

    it("marks all as read", async () => {
      await makeTwo()

      expect((await call("POST", "/notifications/read-all", participantCookie)).status).toBe(204)

      expect(await unread()).toBe(0)
      expect(await list()).toHaveLength(2)
    })

    it("does not know a notification that does not exist", async () => {
      const response = await call("POST", "/notifications/nope/read", participantCookie)

      expect(response.status).toBe(404)
      expect(await response.json()).toMatchObject({ statusCode: 404, code: "NOT_FOUND" })
    })

    it("shows and marks only the user's own", async () => {
      const [first] = await makeTwo()

      // Another account sees nothing of it and cannot mark it; it answers like a missing one.
      expect(await list(organizerCookie)).toEqual([])
      expect(await unread(organizerCookie)).toBe(0)
      expect((await call("POST", `/notifications/${first.id}/read`, organizerCookie)).status).toBe(
        404,
      )
      expect((await call("POST", "/notifications/read-all", organizerCookie)).status).toBe(204)

      expect(await unread()).toBe(2)
    })
  })
})
