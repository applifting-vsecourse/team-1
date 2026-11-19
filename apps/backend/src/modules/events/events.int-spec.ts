import { PrismaService } from "@/core/prisma/prisma.service"
import {
  api,
  connectTestPrisma,
  nextTermNumber,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

type EventBody = {
  id: string
  name: string
  organizationName: string
  organizationContactEmail: string | null
  publicToken: string
  applicationsOpen: boolean
  missing: string[]
  evaluationMode: string
  evaluationModePending: boolean
  cancellationStartsOn: string | null
  cancellationTerms: string | null
}

describe("organizer events (integration)", () => {
  let prisma: PrismaService
  let cookieA: string
  let cookieB: string

  const post = (cookie: string, body: object): Promise<Response> =>
    fetch(api("/organizer/events"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    })

  // The organizer's choice of the evaluation mode, which the application link waits for (US-560).
  const chooseMode = (
    cookie: string,
    id: string,
    evaluationMode = "AUTOMATIC",
  ): Promise<Response> =>
    fetch(api(`/organizer/events/${id}/evaluation-mode`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ evaluationMode }),
    })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookieA = await signIn("organizator@example.com", "password1")
    cookieB = await signIn("organizator2@example.com", "password2")
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("needs an organizer session", async () => {
    expect((await fetch(api("/organizer/events"))).status).toBe(401)
    const participant = await signIn("ucastnik@example.com", "password4")
    const response = await fetch(api("/organizer/events"), { headers: { Cookie: participant } })
    expect(response.status).toBe(403)
  })

  it("creates an event, lists it, and keeps its link closed until it is set up", async () => {
    const response = await post(cookieA, {
      name: "Jarní víkend Lipno 2027",
      location: "Lipno nad Vltavou",
    })

    expect(response.status).toBe(201)
    const created = (await response.json()) as EventBody
    expect(created).toMatchObject({
      name: "Jarní víkend Lipno 2027",
      organizationName: "Letní kemp z. s.",
      applicationsOpen: false,
      missing: ["TERM", "EVALUATION_MODE"],
      evaluationModePending: true,
    })

    // The organization's e-mail comes with the event, in the list and in the detail the form reads.
    const organization = await prisma.organization.findFirstOrThrow({
      where: { name: "Letní kemp z. s." },
    })
    const original = organization.contactEmail
    await prisma.organization.update({
      where: { id: organization.id },
      data: { contactEmail: "office@letni-kemp.example" },
    })
    try {
      const detail = await fetch(api(`/organizer/events/${created.id}`), {
        headers: { Cookie: cookieA },
      })
      expect(((await detail.json()) as EventBody).organizationContactEmail).toBe(
        "office@letni-kemp.example",
      )
      const all = await fetch(api("/organizer/events"), { headers: { Cookie: cookieA } })
      const listed = ((await all.json()) as EventBody[]).find((event) => event.id === created.id)
      expect(listed?.organizationContactEmail).toBe("office@letni-kemp.example")
    } finally {
      await prisma.organization.update({
        where: { id: organization.id },
        data: { contactEmail: original },
      })
    }

    const list = await fetch(api("/organizer/events"), { headers: { Cookie: cookieA } })
    const events = (await list.json()) as EventBody[]
    expect(events.map((event) => event.id)).toContain(created.id)

    const publicPage = await fetch(api(`/public/events/${created.publicToken}`))
    expect(publicPage.status).toBe(404)
  })

  it("closes the public page again when a term without rooms is added (US-99)", async () => {
    const created = (await (await post(cookieA, { name: "Zima" })).json()) as EventBody
    const event = await prisma.event.findUniqueOrThrow({ where: { id: created.id } })
    const makeTerm = async (name: string, day: number) =>
      prisma.term.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          number: await nextTermNumber(prisma, event.id),
          name,
          startsOn: new Date(`2027-12-0${day}`),
          endsOn: new Date(`2027-12-0${day + 1}`),
          priceCzk: 1000,
        },
      })
    await chooseMode(cookieA, created.id)
    const first = await makeTerm("První", 1)
    await prisma.room.create({
      data: {
        organizationId: event.organizationId,
        termId: first.id,
        name: "A",
        capacity: 4,
        gender: "FEMALE",
      },
    })
    expect((await fetch(api(`/public/events/${created.publicToken}`))).status).toBe(200)

    const second = await makeTerm("Druhý", 3)
    expect((await fetch(api(`/public/events/${created.publicToken}`))).status).toBe(404)
    const detail = await fetch(api(`/organizer/events/${created.id}`), {
      headers: { Cookie: cookieA },
    })
    expect(await detail.json()).toMatchObject({ applicationsOpen: false, missing: ["ROOM"] })

    await prisma.room.create({
      data: {
        organizationId: event.organizationId,
        termId: second.id,
        name: "B",
        capacity: 4,
        gender: "MALE",
      },
    })
    expect((await fetch(api(`/public/events/${created.publicToken}`))).status).toBe(200)
  })

  it("opens the public page once every term has a room", async () => {
    const created = (await (await post(cookieA, { name: "Podzim" })).json()) as EventBody
    await chooseMode(cookieA, created.id)
    const event = await prisma.event.findUniqueOrThrow({ where: { id: created.id } })
    const term = await prisma.term.create({
      data: {
        organizationId: event.organizationId,
        eventId: event.id,
        number: await nextTermNumber(prisma, event.id),
        name: "Týden",
        startsOn: new Date("2027-10-01"),
        endsOn: new Date("2027-10-07"),
        priceCzk: 1000,
      },
    })
    await prisma.room.create({
      data: {
        organizationId: event.organizationId,
        termId: term.id,
        name: "A",
        capacity: 4,
        gender: "FEMALE",
      },
    })

    const detail = await fetch(api(`/organizer/events/${created.id}`), {
      headers: { Cookie: cookieA },
    })
    expect(await detail.json()).toMatchObject({
      applicationsOpen: true,
      missing: [],
      startsOn: "2027-10-01",
      endsOn: "2027-10-07",
      terms: [
        {
          name: "Týden",
          startsOn: "2027-10-01",
          endsOn: "2027-10-07",
          capacity: 4,
          confirmedCount: 0,
        },
      ],
    })
    expect((await fetch(api(`/public/events/${created.publicToken}`))).status).toBe(200)
  })

  it("rejects a missing name", async () => {
    const response = await post(cookieA, { description: "bez názvu" })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "VALIDATION_FAILED" })
  })

  it("keeps organizations apart", async () => {
    const created = (await (await post(cookieA, { name: "Jen pro A" })).json()) as EventBody

    const listB = (await (
      await fetch(api("/organizer/events"), { headers: { Cookie: cookieB } })
    ).json()) as EventBody[]
    expect(listB.map((event) => event.id)).not.toContain(created.id)

    const detail = await fetch(api(`/organizer/events/${created.id}`), {
      headers: { Cookie: cookieB },
    })
    expect(detail.status).toBe(403)

    const organizationA = await prisma.organization.findFirstOrThrow({
      where: { name: "Letní kemp z. s." },
    })
    const foreign = await post(cookieB, { organizationId: organizationA.id, name: "Cizí" })
    expect(foreign.status).toBe(403)
  })

  it("sets and clears the cancellation start day, with authorization and calendar validation", async () => {
    const created = (await (await post(cookieA, { name: "Storno test" })).json()) as EventBody
    const url = api(`/organizer/events/${created.id}/cancellation-start`)
    const save = (cookie: string | null, value: unknown): Promise<Response> =>
      fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ cancellationStartsOn: value }),
      })

    expect(created.cancellationStartsOn).toBeNull()
    expect((await save(null, "2027-07-01")).status).toBe(401)
    expect((await save(cookieB, "2027-07-01")).status).toBe(403)
    expect((await save(cookieA, "2027-02-30")).status).toBe(400)
    expect((await save(cookieA, undefined)).status).toBe(400)
    expect((await save(cookieA, "2027-07-01T00:00:00Z")).status).toBe(400)

    // Not retroactive: yesterday and older are rejected and nothing is stored.
    const day = (offset: number): string => {
      const date = new Date(Date.now() + offset * 86_400_000)
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(date)
    }
    const stored = async () =>
      (await prisma.event.findUniqueOrThrow({ where: { id: created.id } })).cancellationStartsOn
    const yesterday = await save(cookieA, day(-1))
    expect(yesterday.status).toBe(400)
    expect(await yesterday.json()).toMatchObject({ code: "CANCELLATION_START_IN_PAST" })
    expect((await save(cookieA, "2020-01-01")).status).toBe(400)
    expect(await stored()).toBeNull()
    expect((await save(cookieA, day(0))).status).toBe(200)
    expect((await save(cookieA, day(30))).status).toBe(200)
    expect((await save(cookieA, day(-1))).status).toBe(400)
    expect((await stored())?.toISOString().slice(0, 10)).toBe(day(30))
    // A lapsed saved day stays valid when unchanged, can be cleared, but not moved to another past day.
    await prisma.event.update({
      where: { id: created.id },
      data: { cancellationStartsOn: new Date("2020-01-01T00:00:00.000Z") },
    })
    expect((await save(cookieA, "2020-01-01")).status).toBe(200)
    expect((await save(cookieA, "2020-01-02")).status).toBe(400)
    expect((await save(cookieA, null)).status).toBe(200)

    const saved = await save(cookieA, day(30))
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({ cancellationStartsOn: day(30) })
    expect(
      (await prisma.event.findUniqueOrThrow({ where: { id: created.id } })).cancellationStartsOn,
    ).toEqual(new Date(`${day(30)}T00:00:00.000Z`))

    const detail = await fetch(api(`/organizer/events/${created.id}`), {
      headers: { Cookie: cookieA },
    })
    expect(await detail.json()).toMatchObject({ cancellationStartsOn: day(30) })
    expect((await save(cookieA, null)).status).toBe(200)
    expect(
      (await prisma.event.findUniqueOrThrow({ where: { id: created.id } })).cancellationStartsOn,
    ).toBeNull()
  })

  it("saves the cancellation terms of an event (US-47)", async () => {
    const created = (await (await post(cookieA, { name: "Storno podmínky" })).json()) as EventBody
    const url = api(`/organizer/events/${created.id}/cancellation-terms`)
    const save = (cookie: string | null, value: unknown): Promise<Response> =>
      fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ cancellationTerms: value }),
      })
    const text = "Při odhlášení více než 30 dní před začátkem se vrací celá částka."

    expect(created.cancellationTerms).toBeNull()
    expect((await save(null, text)).status).toBe(401)
    expect((await save(cookieB, text)).status).toBe(403)
    expect((await save(cookieA, "   ")).status).toBe(400)
    expect((await save(cookieA, "a".repeat(2001))).status).toBe(400)
    expect((await save(cookieA, undefined)).status).toBe(400)

    const saved = await save(cookieA, `  ${text}\n`)
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({ cancellationTerms: text })
    const detail = await fetch(api(`/organizer/events/${created.id}`), {
      headers: { Cookie: cookieA },
    })
    expect(await detail.json()).toMatchObject({ cancellationTerms: text })
    expect(
      (await prisma.event.findUniqueOrThrow({ where: { id: created.id } })).cancellationTerms,
    ).toBe(text)
  })

  it("deletes only an event nobody has applied to", async () => {
    const remove = (cookie: string, id: string): Promise<Response> =>
      fetch(api(`/organizer/events/${id}`), { method: "DELETE", headers: { Cookie: cookie } })
    const created = (await (await post(cookieA, { name: "Ke smazání" })).json()) as EventBody

    expect((await remove(cookieB, created.id)).status).toBe(403)
    expect((await remove(cookieA, created.id)).status).toBe(204)
    expect(await prisma.event.findUnique({ where: { id: created.id } })).toBeNull()

    const applied = await prisma.event.findFirstOrThrow({
      where: { organization: { name: "Letní kemp z. s." }, applications: { some: {} } },
    })
    const conflict = await remove(cookieA, applied.id)
    expect(conflict.status).toBe(409)
    expect(await conflict.json()).toMatchObject({ code: "EVENT_HAS_APPLICATIONS" })
    expect(await prisma.event.findUnique({ where: { id: applied.id } })).not.toBeNull()
  })

  describe("evaluation mode (US-101)", () => {
    const patch = (cookie: string, id: string, body: object): Promise<Response> =>
      fetch(api(`/organizer/events/${id}/evaluation-mode`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify(body),
      })

    it("defaults to automatic, also for events from the seed", async () => {
      const created = (await (await post(cookieA, { name: "Výchozí režim" })).json()) as EventBody
      expect(created).toMatchObject({ evaluationMode: "AUTOMATIC", evaluationModeLocked: false })
      // Only the stored default: a new event still waits for the organizer's choice (US-560).
      expect(created.evaluationModePending).toBe(true)
      // The seed has one manual event (US-103) for the queue to evaluate.
      const seeded = await prisma.event.findMany({
        where: { publicToken: { not: "demo-rucni-vyhodnoceni-2028" } },
      })
      expect(seeded.every((event) => event.evaluationMode === "AUTOMATIC")).toBe(true)
    })

    it("keeps the link closed until the mode is chosen, and confirming the default counts (US-560)", async () => {
      const created = (await (await post(cookieA, { name: "Čeká na režim" })).json()) as EventBody
      const event = await prisma.event.findUniqueOrThrow({ where: { id: created.id } })
      const term = await prisma.term.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          number: await nextTermNumber(prisma, event.id),
          name: "Týden",
          startsOn: new Date("2027-10-01"),
          endsOn: new Date("2027-10-07"),
          priceCzk: 1000,
        },
      })
      await prisma.room.create({
        data: {
          organizationId: event.organizationId,
          termId: term.id,
          name: "A",
          capacity: 4,
          gender: "FEMALE",
        },
      })
      expect(await detail(created.id)).toMatchObject({
        applicationsOpen: false,
        missing: ["EVALUATION_MODE"],
        evaluationModePending: true,
      })
      expect((await fetch(api(`/public/events/${created.publicToken}`))).status).toBe(404)

      // The stored default is AUTOMATIC, and choosing it is what completes the step.
      const chosen = await patch(cookieA, created.id, { evaluationMode: "AUTOMATIC" })
      expect(chosen.status).toBe(200)
      expect(await chosen.json()).toMatchObject({
        evaluationMode: "AUTOMATIC",
        evaluationModePending: false,
        applicationsOpen: true,
        missing: [],
      })
      expect((await fetch(api(`/public/events/${created.publicToken}`))).status).toBe(200)
    })

    it("does not block events that already exist (US-560)", async () => {
      expect(
        await prisma.event.count({
          where: { evaluationModePending: true, applications: { some: {} } },
        }),
      ).toBe(0)
      const seededOpen = await fetch(api("/public/events/demo-rucni-vyhodnoceni-2028"))
      expect(seededOpen.status).toBe(200)
    })

    // An event with a term and a room, so its application link works.
    const openEvent = async (
      name: string,
    ): Promise<{ id: string; publicToken: string; termId: string }> => {
      const created = (await (await post(cookieA, { name })).json()) as EventBody
      await chooseMode(cookieA, created.id)
      const event = await prisma.event.findUniqueOrThrow({ where: { id: created.id } })
      const term = await prisma.term.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          number: await nextTermNumber(prisma, event.id),
          name: "Týden",
          startsOn: new Date("2027-10-01"),
          endsOn: new Date("2027-10-07"),
          priceCzk: 1000,
        },
      })
      await prisma.room.create({
        data: {
          organizationId: event.organizationId,
          termId: term.id,
          name: "A",
          capacity: 4,
          gender: "FEMALE",
        },
      })
      return { id: event.id, publicToken: event.publicToken, termId: term.id }
    }

    const apply = (publicToken: string, termId: string): Promise<Response> =>
      fetch(api(`/public/events/${publicToken}/applications`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `zamek-${Date.now()}@example.com`,
          consent: true,
          participants: [
            {
              firstName: "Test",
              lastName: `Zámek${Date.now()}`,
              birthDate: "2014-05-18",
              gender: "FEMALE",
              termIds: [termId],
            },
          ],
        }),
      })

    const detail = async (id: string): Promise<object> =>
      (await fetch(api(`/organizer/events/${id}`), { headers: { Cookie: cookieA } })).json()

    it("changes the mode while the event has no application, also after applications open (D-083)", async () => {
      const created = (await (await post(cookieA, { name: "Zamykání" })).json()) as EventBody
      const manual = await patch(cookieA, created.id, { evaluationMode: "MANUAL" })
      expect(manual.status).toBe(200)
      expect(await manual.json()).toMatchObject({
        evaluationMode: "MANUAL",
        evaluationModeLocked: false,
        hasApplications: false,
      })
      expect((await patch(cookieA, created.id, { evaluationMode: "nope" })).status).toBe(400)

      const open = await openEvent("Zamykání po otevření")
      expect(await detail(open.id)).toMatchObject({
        applicationsOpen: true,
        evaluationModeLocked: false,
      })
      const changed = await patch(cookieA, open.id, { evaluationMode: "MANUAL" })
      expect(changed.status).toBe(200)
      expect(await changed.json()).toMatchObject({
        evaluationMode: "MANUAL",
        evaluationModeLocked: false,
      })
    })

    it("locks the mode with the first received application", async () => {
      const open = await openEvent("Zamčeno první přihláškou")
      expect((await apply(open.publicToken, open.termId)).status).toBe(201)

      const locked = await patch(cookieA, open.id, { evaluationMode: "MANUAL" })
      expect(locked.status).toBe(409)
      expect(await locked.json()).toMatchObject({ code: "EVALUATION_MODE_LOCKED" })
      expect(
        (await prisma.event.findUniqueOrThrow({ where: { id: open.id } })).evaluationMode,
      ).toBe("AUTOMATIC")
      expect(await detail(open.id)).toMatchObject({
        evaluationMode: "AUTOMATIC",
        evaluationModeLocked: true,
      })
    })

    it("keeps the mode locked when the application was cancelled", async () => {
      const open = await openEvent("Zamčeno zrušenou přihláškou")
      expect((await apply(open.publicToken, open.termId)).status).toBe(201)
      await prisma.applicationTerm.updateMany({
        where: { termId: open.termId },
        data: { status: "CANCELLED" },
      })

      const locked = await patch(cookieA, open.id, { evaluationMode: "MANUAL" })
      expect(locked.status).toBe(409)
      expect(await locked.json()).toMatchObject({ code: "EVALUATION_MODE_LOCKED" })
      expect(await detail(open.id)).toMatchObject({ evaluationModeLocked: true })
    })

    it("keeps organizations and accounts apart", async () => {
      const created = (await (await post(cookieA, { name: "Cizí režim" })).json()) as EventBody
      expect((await patch(cookieB, created.id, { evaluationMode: "MANUAL" })).status).toBe(403)
      expect((await patch("", created.id, { evaluationMode: "MANUAL" })).status).toBe(401)
      const participant = await signIn("ucastnik@example.com", "password4")
      expect((await patch(participant, created.id, { evaluationMode: "MANUAL" })).status).toBe(403)
    })
  })
})
