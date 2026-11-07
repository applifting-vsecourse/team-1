// US-68: the health restriction is saved with the explicit consent and read by organizers only.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

const NOTE = "Astma · inhalátor u sebe."

describe("health restriction (integration)", () => {
  let prisma: PrismaService
  let applicationId: string
  let eventId: string
  let participant: string
  let otherParticipant: string
  let organizer: string
  let foreignOrganizer: string
  let requestId: string

  const request = (
    path: string,
    cookie?: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<Response> =>
    fetch(api(path), {
      method: init.method ?? "GET",
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })

  const save = (cookie: string | undefined, body: unknown): Promise<Response> =>
    request(`/participant/applications/${applicationId}/health`, cookie, { method: "PUT", body })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    await fetch(api("/health")).catch(() => fetch(api("/health")))
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
    const application = await prisma.application.findFirstOrThrow({
      where: { userId: user.id, event: { name: "Letní kemp 2027" } },
    })
    applicationId = application.id
    eventId = application.eventId
    participant = await signIn("ucastnik@example.com", "password4")
    otherParticipant = await signIn("ucastnik2@example.com", "password5")
    organizer = await signIn("organizator@example.com", "password1")
    foreignOrganizer = await signIn("organizator2@example.com", "password2")
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("stores nothing without the explicit consent", async () => {
    const response = await save(participant, { note: NOTE, consent: false })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "HEALTH_CONSENT_REQUIRED" })
    expect(await prisma.applicationHealth.count({ where: { applicationId } })).toBe(0)
  })

  it("is empty until the participant fills it in", async () => {
    const response = await request(`/participant/applications/${applicationId}/health`, participant)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ note: null, consentAt: null })
  })

  it("saves the note with the time of the consent and shows it to the organizer", async () => {
    const saved = await save(participant, { note: `  ${NOTE}  `, consent: true })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({ note: NOTE })

    const seen = await request(`/organizer/applications/${applicationId}/health`, organizer)
    expect(seen.status).toBe(200)
    const body = await seen.json()
    expect(body).toMatchObject({ note: NOTE, eventName: "Letní kemp 2027" })
    expect(new Date(body.consentAt).getTime()).toBeGreaterThan(Date.now() - 60_000)
  })

  it("hides it from other accounts: another participant, a foreign organizer, no session", async () => {
    const own = `/participant/applications/${applicationId}/health`
    const organizerPath = `/organizer/applications/${applicationId}/health`

    expect((await request(own, otherParticipant)).status).toBe(403)
    expect((await save(otherParticipant, { note: "x", consent: true })).status).toBe(403)
    expect((await request(organizerPath, foreignOrganizer)).status).toBe(403)
    expect((await request(organizerPath, participant)).status).toBe(403)
    expect((await request(organizerPath)).status).toBe(401)
    expect((await request(own)).status).toBe(401)
    expect(
      await prisma.applicationHealth.findUniqueOrThrow({ where: { applicationId } }),
    ).toMatchObject({
      note: NOTE,
    })
  })

  it("never leaks into the other responses about the application", async () => {
    const responses = await Promise.all([
      request("/participant/applications", participant),
      request(`/participant/applications/${applicationId}`, participant),
      request(`/organizer/applications/${applicationId}/payments`, organizer),
      request(`/organizer/events/${eventId}/applications`, organizer),
    ])

    for (const response of responses) {
      expect(response.status).toBe(200)
      expect(await response.text()).not.toContain("inhalátor")
    }
  })

  const requestChange = (cookie: string | undefined, body: unknown): Promise<Response> =>
    request(`/participant/applications/${applicationId}/health-change-requests`, cookie, {
      method: "POST",
      body,
    })

  it("refuses to overwrite filled-in data directly: a second PUT needs a request", async () => {
    for (const body of [
      { note: "Jiný údaj", consent: true },
      { note: "", consent: false },
    ]) {
      const response = await save(participant, body)
      expect(response.status).toBe(409)
      expect(await response.json()).toMatchObject({ code: "HEALTH_CHANGE_REQUEST_REQUIRED" })
    }
    expect(
      await prisma.applicationHealth.findUniqueOrThrow({ where: { applicationId } }),
    ).toMatchObject({ note: NOTE })
  })

  it("creates a change request that is visible to the organizer and leaves the data untouched", async () => {
    expect((await requestChange(participant, { note: "Nový údaj", consent: false })).status).toBe(
      400,
    )
    expect((await requestChange(otherParticipant, { note: "x", consent: true })).status).toBe(403)

    const created = await requestChange(participant, { note: "Nový údaj", consent: true })
    expect(created.status).toBe(201)
    expect((await requestChange(participant, { note: "Další", consent: true })).status).toBe(409)

    const own = await request(`/participant/applications/${applicationId}/health`, participant)
    expect(await own.json()).toMatchObject({
      note: NOTE,
      pendingRequest: { note: "Nový údaj" },
    })

    const list = await request(`/organizer/events/${eventId}/change-requests`, organizer)
    const items = await list.json()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: "HEALTH",
      currentHealthNote: NOTE,
      requestedHealthNote: "Nový údaj",
    })
    // The term-change list of the participant does not show it.
    const terms = await request(
      `/participant/applications/${applicationId}/change-requests`,
      participant,
    )
    expect(await terms.json()).toEqual([])
    requestId = items[0].id
  })

  it("keeps a foreign organizer away from the request", async () => {
    const decide = (cookie: string, action: string) =>
      request(`/organizer/events/${eventId}/change-requests/${requestId}/${action}`, cookie, {
        method: "PATCH",
        body: {},
      })
    expect((await decide(foreignOrganizer, "approve")).status).toBe(403)
    expect((await decide(foreignOrganizer, "reject")).status).toBe(403)
    expect(
      (await request(`/organizer/events/${eventId}/change-requests`, foreignOrganizer)).status,
    ).toBe(403)
    expect(
      await prisma.applicationHealth.findUniqueOrThrow({ where: { applicationId } }),
    ).toMatchObject({ note: NOTE })
  })

  it("writes the requested note when the organizer approves", async () => {
    const response = await request(
      `/organizer/events/${eventId}/change-requests/${requestId}/approve`,
      organizer,
      { method: "PATCH", body: {} },
    )

    expect(response.status).toBe(204)
    expect(
      await prisma.applicationHealth.findUniqueOrThrow({ where: { applicationId } }),
    ).toMatchObject({ note: "Nový údaj" })
    const own = await request(`/participant/applications/${applicationId}/health`, participant)
    expect(await own.json()).toMatchObject({ note: "Nový údaj", pendingRequest: null })
  })

  it("keeps the data when the organizer rejects, and removes it when an empty note is approved", async () => {
    await requestChange(participant, { note: "Odmítnuto", consent: true })
    let items = await (
      await request(`/organizer/events/${eventId}/change-requests`, organizer)
    ).json()
    const reject = await request(
      `/organizer/events/${eventId}/change-requests/${items[0].id}/reject`,
      organizer,
      { method: "PATCH", body: { reason: "ne" } },
    )
    expect(reject.status).toBe(204)
    expect(
      await prisma.applicationHealth.findUniqueOrThrow({ where: { applicationId } }),
    ).toMatchObject({ note: "Nový údaj" })

    expect((await requestChange(participant, { note: "  ", consent: false })).status).toBe(201)
    items = await (await request(`/organizer/events/${eventId}/change-requests`, organizer)).json()
    await request(
      `/organizer/events/${eventId}/change-requests/${items[0].id}/approve`,
      organizer,
      {
        method: "PATCH",
        body: {},
      },
    )
    expect(await prisma.applicationHealth.count({ where: { applicationId } })).toBe(0)
    // Nothing stored any more: the participant writes directly again and needs no request.
    expect((await requestChange(participant, { note: "x", consent: true })).status).toBe(409)
  })

  it("rejects a note over the limit and unknown fields", async () => {
    expect((await save(participant, { note: "x".repeat(2001), consent: true })).status).toBe(400)
    expect((await save(participant, { note: "x", consent: true, userId: "u" })).status).toBe(400)
  })
})
