import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

describe("participant application edit (integration)", () => {
  let prisma: PrismaService
  let participantCookie: string
  let organizerCookie: string
  let ownId: string

  const call = (method: string, id: string, cookie?: string, body?: unknown): Promise<Response> =>
    fetch(api(`/participant/applications/${id}/edit`), {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

  // Spaces, brackets and dashes are removed before the phone is compared and stored.
  const normalizedPhone = "+420777123456"
  const input = {
    firstName: "Jana",
    lastName: "Nováková",
    birthDate: "2000-05-15",
    phone: "+420 777 123 456",
    accommodationRequest: "Prosím o pokoj v přízemí.",
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    await fetch(api("/health")).catch(() => fetch(api("/health")))
    participantCookie = await signIn("ucastnik@example.com", "password4")
    organizerCookie = await signIn("organizator@example.com", "password1")
    ownId = (
      await prisma.application.findFirstOrThrow({
        where: { email: "ucastnik@example.com", event: { name: "Letní kemp 2027" } },
      })
    ).id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("returns editable details only to the owner", async () => {
    const response = await call("GET", ownId, participantCookie)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      id: ownId,
      eventName: "Letní kemp 2027",
      firstName: "Jana",
      phone: null,
      accommodationRequest: null,
      history: [],
    })

    const foreign = await prisma.application.findFirstOrThrow({
      where: { email: "tomas.dvorak@example.com" },
    })
    for (const method of ["GET", "PUT"]) {
      const denied = await call(
        method,
        foreign.id,
        participantCookie,
        method === "PUT" ? input : undefined,
      )
      expect(denied.status).toBe(403)
      expect(await denied.text()).not.toContain(foreign.firstName)
    }
    expect((await call("GET", ownId)).status).toBe(401)
    expect((await call("GET", ownId, organizerCookie)).status).toBe(403)
  })

  it("validates fields before writing", async () => {
    for (const invalid of [
      { ...input, firstName: "  " },
      { ...input, birthDate: "2027-02-30" },
      { ...input, phone: "abc" },
      { ...input, phone: "(((((((" },
      { ...input, accommodationRequest: "x".repeat(2001) },
    ]) {
      expect((await call("PUT", ownId, participantCookie, invalid)).status).toBe(400)
    }
    expect(await prisma.applicationEdit.count({ where: { applicationId: ownId } })).toBe(0)
  })

  it("updates fields, records actor and time, and notifies every organizer once", async () => {
    const response = await call("PUT", ownId, participantCookie, input)
    expect(response.status).toBe(200)
    const saved = await response.json()
    expect(saved).toMatchObject({
      firstName: "Jana",
      lastName: "Nováková",
      birthDate: "2000-05-15",
      phone: normalizedPhone,
      accommodationRequest: "Prosím o pokoj v přízemí.",
      history: [
        {
          authorName: "Jana Nováková",
          changedFields: ["birthDate", "phone", "accommodationRequest"],
        },
      ],
    })
    expect(new Date(saved.history[0].createdAt).getTime()).toBeGreaterThan(0)

    const application = await prisma.application.findUniqueOrThrow({ where: { id: ownId } })
    expect(application.phone).toBe(normalizedPhone)
    expect(application.accommodationRequest).toBe(input.accommodationRequest)
    const history = await prisma.applicationEdit.findFirstOrThrow({
      where: { applicationId: ownId },
    })
    expect(history.changedById).toBe(application.userId)
    expect(history.before).toMatchObject({ phone: null, accommodationRequest: null })
    expect(history.after).toMatchObject({ phone: normalizedPhone })

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: application.organizationId, user: { accountType: "ORGANIZER" } },
    })
    const notices = await prisma.notification.findMany({
      where: { applicationId: ownId, kind: "APPLICATION_EDITED" },
    })
    expect(notices).toHaveLength(members.length)
    expect(notices.every((notice) => notice.readAt === null)).toBe(true)
    expect(notices.every((notice) => notice.type === "REQUEST")).toBe(true)
    expect(
      notices.every(
        (notice) => (notice.params as { eventId?: string }).eventId === application.eventId,
      ),
    ).toBe(true)

    const organizerFeed = await fetch(api("/notifications"), {
      headers: { Cookie: organizerCookie },
    })
    expect(organizerFeed.status).toBe(200)
    expect(await organizerFeed.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "APPLICATION_EDITED",
          applicationId: ownId,
          params: expect.objectContaining({ eventId: application.eventId }),
        }),
      ]),
    )
    const organizerDetail = await fetch(api(`/organizer/applications/${ownId}/payments`), {
      headers: { Cookie: organizerCookie },
    })
    expect(organizerDetail.status).toBe(200)
    expect(await organizerDetail.json()).toMatchObject({
      accommodationRequest: input.accommodationRequest,
    })

    const repeated = await call("PUT", ownId, participantCookie, input)
    expect(repeated.status).toBe(200)
    expect(await prisma.applicationEdit.count({ where: { applicationId: ownId } })).toBe(1)
    expect(
      await prisma.notification.count({
        where: { applicationId: ownId, kind: "APPLICATION_EDITED" },
      }),
    ).toBe(members.length)
  })

  it("rejects a duplicate identity on an active term but ignores a cancelled one", async () => {
    const own = await prisma.application.findUniqueOrThrow({
      where: { id: ownId },
      include: { terms: true },
    })
    const activeTerm = own.terms.find((term) => term.status !== "CANCELLED")!
    const other = await prisma.application.create({
      data: {
        organizationId: own.organizationId,
        eventId: own.eventId,
        accessToken: randomUUID(),
        firstName: "Květoslav",
        lastName: "Zkouška",
        birthDate: new Date("1999-06-20T00:00:00.000Z"),
        gender: own.gender,
        email: "duplicate-edit@example.com",
        consentAt: new Date(),
        terms: {
          create: {
            organizationId: own.organizationId,
            termId: activeTerm.termId,
            status: "WAITLISTED",
            priceCzk: activeTerm.priceCzk,
          },
        },
      },
      include: { terms: true },
    })
    const duplicateInput = {
      ...input,
      firstName: "kvetoslav",
      lastName: "Zkouska",
      birthDate: "1999-06-20",
    }
    const before = await prisma.applicationEdit.count({ where: { applicationId: ownId } })
    const rejected = await call("PUT", ownId, participantCookie, duplicateInput)
    expect(rejected.status).toBe(409)
    expect(await prisma.applicationEdit.count({ where: { applicationId: ownId } })).toBe(before)
    expect((await prisma.application.findUniqueOrThrow({ where: { id: ownId } })).firstName).toBe(
      own.firstName,
    )

    await prisma.applicationTerm.update({
      where: { id: other.terms[0].id },
      data: { status: "CANCELLED" },
    })
    const allowed = await call("PUT", ownId, participantCookie, duplicateInput)
    expect(allowed.status).toBe(200)
  })

  it("does not edit a cancelled application or one whose terms are over", async () => {
    const terms = await prisma.applicationTerm.findMany({
      where: { applicationId: ownId },
      include: { term: true },
    })
    const edits = await prisma.applicationEdit.count({ where: { applicationId: ownId } })
    const attempt = { ...input, firstName: "Zrušená" }

    try {
      await prisma.applicationTerm.updateMany({
        where: { applicationId: ownId },
        data: { status: "CANCELLED" },
      })
      const cancelled = await call("PUT", ownId, participantCookie, attempt)
      expect(cancelled.status).toBe(409)
      expect(await cancelled.json()).toMatchObject({ code: "APPLICATION_NOT_EDITABLE" })
    } finally {
      for (const term of terms) {
        await prisma.applicationTerm.update({
          where: { id: term.id },
          data: { status: term.status },
        })
      }
    }

    try {
      for (const { term } of terms) {
        await prisma.term.update({
          where: { id: term.id },
          data: { startsOn: new Date("2020-07-01"), endsOn: new Date("2020-07-08") },
        })
      }
      const over = await call("PUT", ownId, participantCookie, attempt)
      expect(over.status).toBe(409)
      expect(await over.json()).toMatchObject({ code: "APPLICATION_NOT_EDITABLE" })
    } finally {
      for (const { term } of terms) {
        await prisma.term.update({
          where: { id: term.id },
          data: { startsOn: term.startsOn, endsOn: term.endsOn },
        })
      }
    }

    expect(await prisma.applicationEdit.count({ where: { applicationId: ownId } })).toBe(edits)
    expect(
      (await prisma.application.findUniqueOrThrow({ where: { id: ownId } })).firstName,
    ).not.toBe("Zrušená")
  })
})
