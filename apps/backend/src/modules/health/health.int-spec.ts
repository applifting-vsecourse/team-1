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

  it("removes the record when the participant clears the note, without a consent", async () => {
    const response = await save(participant, { note: "   ", consent: false })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ note: null, consentAt: null })
    expect(await prisma.applicationHealth.count({ where: { applicationId } })).toBe(0)
  })

  it("rejects a note over the limit and unknown fields", async () => {
    expect((await save(participant, { note: "x".repeat(2001), consent: true })).status).toBe(400)
    expect((await save(participant, { note: "x", consent: true, userId: "u" })).status).toBe(400)
  })
})
