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
      phone: "+420 777 123 456",
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
    expect(application.phone).toBe(input.phone)
    expect(application.accommodationRequest).toBe(input.accommodationRequest)
    const history = await prisma.applicationEdit.findFirstOrThrow({
      where: { applicationId: ownId },
    })
    expect(history.changedById).toBe(application.userId)
    expect(history.before).toMatchObject({ phone: null, accommodationRequest: null })
    expect(history.after).toMatchObject({ phone: input.phone })

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: application.organizationId, user: { accountType: "ORGANIZER" } },
    })
    const notices = await prisma.notification.findMany({
      where: { applicationId: ownId, kind: "APPLICATION_EDITED" },
    })
    expect(notices).toHaveLength(members.length)
    expect(notices.every((notice) => notice.readAt === null)).toBe(true)
    expect(notices.every((notice) => notice.type === "REQUEST")).toBe(true)

    const repeated = await call("PUT", ownId, participantCookie, input)
    expect(repeated.status).toBe(200)
    expect(await prisma.applicationEdit.count({ where: { applicationId: ownId } })).toBe(1)
    expect(
      await prisma.notification.count({
        where: { applicationId: ownId, kind: "APPLICATION_EDITED" },
      }),
    ).toBe(members.length)
  })
})
