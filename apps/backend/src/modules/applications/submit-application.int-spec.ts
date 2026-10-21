// US-27: submitting an application evaluates every term by free beds, also under concurrency.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed } from "@/test/integration/test-api"

type Gender = "FEMALE" | "MALE"
type SubmitBody = {
  accessToken: string
  applications: { number: number; terms: { termId: string; status: string }[] }[]
}

describe("submit application (integration)", () => {
  let prisma: PrismaService
  let publicToken: string
  let termIds: string[]
  let eventId: string
  let counter = 0

  const participant = (gender: Gender, terms: string[]): object => ({
    firstName: "Test",
    lastName: "Participant",
    birthDate: "2014-05-18",
    gender,
    termIds: terms,
  })

  const submit = (
    participants: object[],
    email = `applicant-${++counter}@example.com`,
  ): Promise<Response> =>
    fetch(api(`/public/events/${publicToken}/applications`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, consent: true, participants }),
    })

  const statusesIn = async (termId: string, gender: Gender): Promise<string[]> => {
    const rows = await prisma.applicationTerm.findMany({
      where: { termId, application: { gender, eventId } },
    })
    return rows.map((row) => row.status)
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    const organization = await prisma.organization.findFirstOrThrow()
    publicToken = "us-27-event"
    const event = await prisma.event.create({
      data: {
        organizationId: organization.id,
        name: "US-27",
        publicToken,
        // 2 women's beds, 1 men's bed in every term.
        rooms: {
          create: [
            { organizationId: organization.id, name: "A", capacity: 2, gender: "FEMALE" },
            { organizationId: organization.id, name: "B", capacity: 1, gender: "MALE" },
          ],
        },
        terms: {
          create: ["T1", "T2"].map((name, index) => ({
            organizationId: organization.id,
            name,
            startsOn: new Date(`2027-07-0${index + 1}`),
            endsOn: new Date(`2027-07-0${index + 2}`),
            priceCzk: 1000,
          })),
        },
      },
      include: { terms: { orderBy: { name: "asc" } } },
    })
    eventId = event.id
    termIds = event.terms.map((term) => term.id)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("confirms while beds are free, saves the rest as waitlisted and freezes the price", async () => {
    const [t1] = termIds
    const results: SubmitBody[] = []
    for (let i = 0; i < 3; i++) {
      const response = await submit([participant("FEMALE", [t1])])
      expect(response.status).toBe(201)
      results.push((await response.json()) as SubmitBody)
    }

    expect(results.map((body) => body.applications[0].terms[0].status)).toEqual([
      "CONFIRMED",
      "CONFIRMED",
      "WAITLISTED",
    ])
    const stored = await prisma.applicationTerm.findFirstOrThrow({
      where: { application: { number: results[2].applications[0].number } },
    })
    expect(stored).toMatchObject({ status: "WAITLISTED", priceCzk: 1000 })
  })

  it("evaluates each term of one participant separately", async () => {
    const [t1, t2] = termIds
    // T1 women's beds are taken by the previous test; T2 is empty.
    const response = await submit([participant("FEMALE", [t1, t2])])
    const body = (await response.json()) as SubmitBody

    expect(Object.fromEntries(body.applications[0].terms.map((t) => [t.termId, t.status]))).toEqual(
      { [t1]: "WAITLISTED", [t2]: "CONFIRMED" },
    )
  })

  it("uses the capacity of the participant's gender", async () => {
    const [t1] = termIds
    const body = (await (await submit([participant("MALE", [t1])])).json()) as SubmitBody
    expect(body.applications[0].terms[0].status).toBe("CONFIRMED")
  })

  it("stores one application per participant of a submission, each taking a bed", async () => {
    const [, t2] = termIds
    // T2: one women's bed left (one taken above), one men's bed.
    const body = (await (
      await submit([participant("FEMALE", [t2]), participant("FEMALE", [t2])])
    ).json()) as SubmitBody

    expect(body.applications.map((application) => application.terms[0].status)).toEqual([
      "CONFIRMED",
      "WAITLISTED",
    ])
  })

  it("never exceeds the capacity when many applications arrive at once", async () => {
    const [t1, t2] = termIds
    // Fresh state for the term pair: wipe this event's applications.
    await prisma.application.deleteMany({ where: { eventId } })

    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        submit([participant(i % 2 === 0 ? "FEMALE" : "MALE", i % 3 === 0 ? [t2, t1] : [t1, t2])]),
      ),
    )
    expect(responses.map((response) => response.status)).toEqual(Array(12).fill(201))

    for (const termId of termIds) {
      const women = await statusesIn(termId, "FEMALE")
      const men = await statusesIn(termId, "MALE")
      expect(women).toHaveLength(6)
      expect(women.filter((status) => status === "CONFIRMED")).toHaveLength(2)
      expect(men).toHaveLength(6)
      expect(men.filter((status) => status === "CONFIRMED")).toHaveLength(1)
    }
  })

  it("rejects a term of another event and an impossible birth date", async () => {
    const other = await prisma.term.findFirstOrThrow({ where: { eventId: { not: eventId } } })
    expect((await submit([participant("MALE", [other.id])])).status).toBe(400)
    const bad = { ...participant("MALE", [termIds[0]]), birthDate: "2014-02-30" }
    expect((await submit([bad])).status).toBe(400)
  })

  it("answers an unknown link with 404 and an organizer's e-mail with 409", async () => {
    const unknown = await fetch(api("/public/events/does-not-exist/applications"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "a@example.com",
        consent: true,
        participants: [participant("MALE", [termIds[0]])],
      }),
    })
    expect(unknown.status).toBe(404)

    const organizer = await submit([participant("MALE", [termIds[0]])], "organizator@example.com")
    expect(organizer.status).toBe(409)
    expect(((await organizer.json()) as { code: string }).code).toBe("EMAIL_NOT_ALLOWED")
  })
})
