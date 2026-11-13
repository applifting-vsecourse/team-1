// US-66: the organizer builds the program of a term from blocks, the participant sees the program of
// the terms they are confirmed in, and a change shows at once.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Block = {
  id: string
  date: string
  startTime: string
  endTime: string
  name: string
  place: string | null
  description: string | null
}
type TermProgram = { termId: string; startsOn: string; endsOn: string; blocks: Block[] }

describe("program (integration)", () => {
  let prisma: PrismaService
  let organizer: string
  let otherOrganizer: string
  let participant: string
  let eventId: string
  let applicationId: string
  let termId: string
  let otherTermId: string
  let day: string
  let nextDay: string

  const send = (path: string, cookie: string, method = "GET", body?: unknown): Promise<Response> =>
    fetch(api(path), {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const base = () => `/organizer/events/${eventId}/program`
  const add = (body: unknown, term = termId) =>
    send(`${base()}/terms/${term}/blocks`, organizer, "POST", body)
  const terms = async (): Promise<TermProgram[]> =>
    ((await (await send(base(), organizer)).json()) as { terms: TermProgram[] }).terms
  const blocks = async (term = termId): Promise<Block[]> =>
    (await terms()).find((item) => item.termId === term)!.blocks
  const seen = async (): Promise<TermProgram[]> =>
    (
      (await (
        await send(`/participant/applications/${applicationId}/program`, participant)
      ).json()) as { terms: TermProgram[] }
    ).terms
  const block = (patch: object = {}) => ({
    date: day,
    startTime: "10:00",
    endTime: "12:00",
    name: "Dílny",
    place: "Chata A–C",
    description: "Výroba suvenýrů",
    ...patch,
  })
  const plusDays = (iso: string, count: number) =>
    new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + count * 86_400_000)
      .toISOString()
      .slice(0, 10)

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    organizer = await signIn("organizator@example.com", "password1")
    otherOrganizer = await signIn("organizator2@example.com", "password2")
    participant = await signIn("ucastnik@example.com", "password4")
    const application = await prisma.application.findFirstOrThrow({
      where: {
        user: { email: "ucastnik@example.com" },
        event: { publicToken: "demo-letni-kemp-2027" },
      },
      include: { terms: { include: { term: true }, orderBy: { term: { startsOn: "asc" } } } },
    })
    applicationId = application.id
    eventId = application.eventId
    const active = application.terms.filter((row) => row.status !== "CANCELLED")
    termId = active[0].termId
    otherTermId = active[1].termId
    day = active[0].term.startsOn.toISOString().slice(0, 10)
    nextDay = plusDays(day, 1)
    // The program is only for confirmed terms: the first is confirmed, the second waitlisted.
    await prisma.applicationTerm.update({
      where: { applicationId_termId: { applicationId, termId } },
      data: { status: "CONFIRMED" },
    })
    await prisma.applicationTerm.update({
      where: { applicationId_termId: { applicationId, termId: otherTermId } },
      data: { status: "WAITLISTED" },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("lets the organizer add a block and lists blocks by day and time", async () => {
    expect(
      (await add(block({ date: nextDay, startTime: "08:00", endTime: "09:00", name: "Snídaně" })))
        .status,
    ).toBe(204)
    expect((await add(block())).status).toBe(204)
    expect(
      (
        await add(
          block({
            startTime: "08:30",
            endTime: "09:30",
            name: "Rozcvička",
            place: "  ",
            description: "",
          }),
        )
      ).status,
    ).toBe(204)
    const list = await blocks()
    expect(list.map((item) => item.name)).toEqual(["Rozcvička", "Dílny", "Snídaně"])
    expect(list[0]).toMatchObject({ place: null, description: null, date: day })
  })

  it("edits and deletes a block", async () => {
    const [first] = await blocks()
    const edit = await send(
      `${base()}/blocks/${first.id}`,
      organizer,
      "PUT",
      block({ name: "Ranní hry" }),
    )
    expect(edit.status).toBe(204)
    expect((await blocks()).find((item) => item.id === first.id)?.name).toBe("Ranní hry")
    expect((await send(`${base()}/blocks/${first.id}`, organizer, "DELETE")).status).toBe(204)
    expect((await blocks()).some((item) => item.id === first.id)).toBe(false)
  })

  it("rejects a missing name, a bad time, an end before the start and a day outside the term", async () => {
    expect((await add(block({ name: "  " }))).status).toBe(400)
    expect((await add(block({ startTime: "9:00" }))).status).toBe(400)
    const reversed = await add(block({ startTime: "12:00", endTime: "10:00" }))
    expect(reversed.status).toBe(400)
    expect(await reversed.json()).toMatchObject({ code: "PROGRAM_END_BEFORE_START" })
    const outside = await add(block({ date: plusDays(day, -1) }))
    expect(outside.status).toBe(400)
    expect(await outside.json()).toMatchObject({ code: "PROGRAM_DAY_OUTSIDE_TERM" })
  })

  it("keeps another organization out", async () => {
    const [any] = await blocks()
    expect((await send(base(), otherOrganizer)).status).toBe(403)
    expect(
      (await send(`${base()}/terms/${termId}/blocks`, otherOrganizer, "POST", block())).status,
    ).toBe(403)
    expect((await send(`${base()}/blocks/${any.id}`, otherOrganizer, "PUT", block())).status).toBe(
      403,
    )
    expect((await send(`${base()}/blocks/${any.id}`, otherOrganizer, "DELETE")).status).toBe(403)
    expect((await send(base(), participant)).status).toBe(403)
  })

  it("shows the participant the program of confirmed terms only, and a change at once", async () => {
    await add(block({ name: "Večerní hra" }), otherTermId)
    const shown = await seen()
    expect(shown.map((item) => item.termId)).toEqual([termId])
    expect(shown[0].blocks.map((item) => item.name)).toContain("Dílny")

    expect(
      (await add(block({ name: "Nový blok", startTime: "20:00", endTime: "21:00" }))).status,
    ).toBe(204)
    expect((await seen())[0].blocks.map((item) => item.name)).toContain("Nový blok")
    const created = (await blocks()).find((item) => item.name === "Nový blok")!
    await send(`${base()}/blocks/${created.id}`, organizer, "DELETE")
    expect((await seen())[0].blocks.map((item) => item.name)).not.toContain("Nový blok")
  })

  it("keeps someone else's application out", async () => {
    expect(
      (await send(`/participant/applications/${applicationId}/program`, organizer)).status,
    ).toBe(403)
    const foreign = await prisma.application.findFirstOrThrow({
      where: { NOT: { id: applicationId }, userId: { not: null } },
    })
    expect(
      (await send(`/participant/applications/${foreign.id}/program`, participant)).status,
    ).toBe(403)
    expect((await send(`/participant/applications/nope/program`, participant)).status).toBe(403)
  })

  it("hides a cancelled term and refuses blocks in it", async () => {
    await prisma.term.update({ where: { id: otherTermId }, data: { cancelledAt: new Date() } })
    expect((await terms()).some((item) => item.termId === otherTermId)).toBe(false)
    const refused = await add(block(), otherTermId)
    expect(refused.status).toBe(400)
    expect(await refused.json()).toMatchObject({ code: "TERM_CANCELLED" })
    await prisma.term.update({ where: { id: termId }, data: { cancelledAt: new Date() } })
    expect(await seen()).toEqual([])
  })
})
