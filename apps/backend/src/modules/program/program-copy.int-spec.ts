// US-142: one-off copy of the program of another term of the event into this term.
import { PrismaService } from "@/core/prisma/prisma.service"
import {
  api,
  connectTestPrisma,
  nextTermNumber,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

type Result = {
  copied: number
  skipped: number
  overlaps: { date: string; first: string; second: string }[]
}

describe("copying the program between terms (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let participantCookie: string
  let eventId: string
  let organizationId: string
  let source: string
  let target: string
  let longTarget: string
  let foreignTerm: string

  const call = (path: string, method = "GET", body?: unknown, session = cookie) =>
    fetch(api(`/organizer/events/${eventId}/program${path}`), {
      method,
      headers: { Cookie: session, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const copy = (to: string, sourceTermId: string, strategy: "ADD" | "REPLACE", session = cookie) =>
    call(`/terms/${to}/copy`, "POST", { sourceTermId, strategy }, session)
  const blocks = async (termId: string) => {
    const body = (await (await call("")).json()) as {
      terms: {
        termId: string
        blocks: {
          id: string
          date: string
          name: string
          place: string | null
          description: string | null
          startTime: string
          endTime: string
        }[]
      }[]
    }
    return body.terms.find((term) => term.termId === termId)!.blocks
  }
  const block = (
    termId: string,
    date: string,
    name: string,
    startTime = "10:00",
    endTime = "11:00",
  ) => ({
    organizationId,
    termId,
    date: new Date(`${date}T00:00:00.000Z`),
    startTime,
    endTime,
    name,
    place: "Louka",
    description: "Popis",
  })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { user: { email: "organizator@example.com" } },
    })
    organizationId = member.organizationId
    eventId = (
      await prisma.event.create({
        data: {
          organizationId,
          name: "Program copy test",
          publicToken: "program-copy-integration-test",
        },
      })
    ).id
    const makeTerm = async (name: string, from: string, to: string) =>
      (
        await prisma.term.create({
          data: {
            organizationId,
            eventId,
            number: await nextTermNumber(prisma, eventId),
            name,
            startsOn: new Date(from),
            endsOn: new Date(to),
            priceCzk: 1000,
          },
        })
      ).id
    // The source has 4 days, the target 2: blocks of days 3 and 4 are skipped.
    source = await makeTerm("Source", "2027-06-01", "2027-06-04")
    target = await makeTerm("Target", "2027-06-10", "2027-06-11")
    longTarget = await makeTerm("Long", "2027-06-20", "2027-06-25")
    await prisma.programBlock.createMany({
      data: [
        block(source, "2027-06-01", "První"),
        block(source, "2027-06-02", "Druhý"),
        block(source, "2027-06-03", "Třetí"),
        block(source, "2027-06-04", "Čtvrtý"),
      ],
    })
    foreignTerm = (
      await prisma.term.findFirstOrThrow({ where: { organizationId: { not: organizationId } } })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("protects the copy by session, role and organization", async () => {
    expect((await copy(target, source, "ADD", "")).status).toBe(401)
    expect((await copy(target, source, "ADD", participantCookie)).status).toBe(403)
    const other = await signIn("organizator2@example.com", "password2")
    expect((await copy(target, source, "ADD", other)).status).toBe(403)
    expect((await copy(target, foreignTerm, "ADD")).status).toBe(403)
    expect(await blocks(target)).toEqual([])
  })

  it("rejects invalid bodies, the same term and a source without a program", async () => {
    expect((await call(`/terms/${target}/copy`, "POST", { sourceTermId: source })).status).toBe(400)
    expect((await copy(source, source, "ADD")).status).toBe(400)
    expect((await copy(source, target, "ADD")).status).toBe(400)
  })

  it("copies day N to day N, skips the days the target does not have and leaves the source", async () => {
    const response = await copy(target, source, "ADD")
    expect(response.status).toBe(200)
    expect((await response.json()) as Result).toEqual({ copied: 2, skipped: 2, overlaps: [] })
    expect(
      (await blocks(target)).map(({ date, name, place, description, startTime, endTime }) => ({
        date,
        name,
        place,
        description,
        startTime,
        endTime,
      })),
    ).toEqual([
      {
        date: "2027-06-10",
        name: "První",
        place: "Louka",
        description: "Popis",
        startTime: "10:00",
        endTime: "11:00",
      },
      {
        date: "2027-06-11",
        name: "Druhý",
        place: "Louka",
        description: "Popis",
        startTime: "10:00",
        endTime: "11:00",
      },
    ])
    expect((await blocks(source)).map((item) => item.name)).toEqual([
      "První",
      "Druhý",
      "Třetí",
      "Čtvrtý",
    ])
  })

  it("keeps the copies independent of the source", async () => {
    const [first] = await blocks(target)
    const sourceFirst = (await blocks(source))[0]
    expect(first.id).not.toBe(sourceFirst.id)
    await call(`/blocks/${first.id}`, "DELETE")
    expect((await blocks(source)).map((item) => item.name)).toEqual([
      "První",
      "Druhý",
      "Třetí",
      "Čtvrtý",
    ])
  })

  it("adds to the existing program and reports overlaps without refusing the copy", async () => {
    await prisma.programBlock.create({ data: block(target, "2027-06-10", "Hry", "10:30", "12:00") })
    const response = await copy(target, source, "ADD")
    expect(response.status).toBe(200)
    expect(((await response.json()) as Result).overlaps).toEqual([
      { date: "2027-06-10", first: "První", second: "Hry" },
      // The copy of day 2 meets the copy made before.
      { date: "2027-06-11", first: "Druhý", second: "Druhý" },
    ])
    expect((await blocks(target)).map((item) => item.name).sort()).toEqual([
      "Druhý",
      "Druhý",
      "Hry",
      "První",
    ])
  })

  it("replaces the existing program", async () => {
    const response = await copy(target, source, "REPLACE")
    expect((await response.json()) as Result).toEqual({ copied: 2, skipped: 2, overlaps: [] })
    expect((await blocks(target)).map((item) => item.name)).toEqual(["První", "Druhý"])
  })

  it("copies every block into a longer term", async () => {
    expect(((await (await copy(longTarget, source, "ADD")).json()) as Result).copied).toBe(4)
  })
})
