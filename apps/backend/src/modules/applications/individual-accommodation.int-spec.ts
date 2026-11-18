// US-38: the request for individual accommodation is stored at submission, stays with the organizer
// and does not change the capacity by gender (US-26).
import { readFileSync } from "node:fs"
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, latestEmailTo, resetAndSeed } from "@/test/integration/test-api"

type Gender = "FEMALE" | "MALE"
type SubmitBody = {
  applications: { number: number; terms: { termId: string; status: string }[] }[]
}

describe("individual accommodation at submission (integration)", () => {
  let prisma: PrismaService
  let termId: string
  let eventId: string
  const publicToken = "us-38-event"
  let counter = 0

  const participant = (gender: Gender, extra: object = {}): object => ({
    firstName: "Test",
    lastName: `Participant${++counter}`,
    birthDate: "2014-05-18",
    gender,
    termIds: [termId],
    ...extra,
  })
  const submit = (participants: object[], email = `individual-${++counter}@example.com`) =>
    fetch(api(`/public/events/${publicToken}/applications`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, consent: true, participants }),
    })

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    const organization = await prisma.organization.findFirstOrThrow()
    const event = await prisma.event.create({
      data: {
        organizationId: organization.id,
        name: "US-38",
        publicToken,
        terms: {
          create: [
            {
              organizationId: organization.id,
              number: 1,
              name: "T1",
              // 1 women's bed and 1 men's bed.
              rooms: {
                create: [
                  { organizationId: organization.id, name: "A", capacity: 1, gender: "FEMALE" },
                  { organizationId: organization.id, name: "B", capacity: 1, gender: "MALE" },
                ],
              },
              startsOn: new Date("2027-07-01"),
              endsOn: new Date("2027-07-02"),
              priceCzk: 1000,
            },
          ],
        },
      },
      include: { terms: true },
    })
    eventId = event.id
    termId = event.terms[0].id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("stores the request and its note, drops a note without the request and keeps it from e-mails", async () => {
    const note = "Prosím o pokoj v přízemí."
    const email = `individual-mail-${++counter}@example.com`
    const response = await submit(
      [
        participant("MALE", { individualAccommodation: true, accommodationRequest: `  ${note} ` }),
        participant("MALE", { accommodationRequest: "Not asked" }),
        participant("MALE"),
      ],
      email,
    )
    expect(response.status).toBe(201)
    const body = (await response.json()) as SubmitBody
    const stored = await prisma.application.findMany({
      where: { number: { in: body.applications.map((application) => application.number) } },
      orderBy: { number: "asc" },
      select: { individualAccommodation: true, accommodationRequest: true },
    })
    expect(stored).toEqual([
      { individualAccommodation: true, accommodationRequest: note },
      { individualAccommodation: false, accommodationRequest: null },
      { individualAccommodation: false, accommodationRequest: null },
    ])

    // AC3: the request is for the organizer only — not in the response, not in the e-mail.
    expect(JSON.stringify(body)).not.toContain(note)
    expect(await latestEmailTo(email)).toBeDefined()
    expect(readFileSync(process.env.TEST_MAIL_LOG as string, "utf8")).not.toContain(note)
  })

  it("rejects an invalid request or a note over 2000 characters and stores nothing", async () => {
    const before = await prisma.application.count({ where: { eventId } })
    for (const invalid of [
      { individualAccommodation: "yes" },
      { individualAccommodation: true, accommodationRequest: "x".repeat(2001) },
    ]) {
      expect((await submit([participant("FEMALE", invalid)])).status).toBe(400)
    }
    expect(await prisma.application.count({ where: { eventId } })).toBe(before)
  })

  it("counts the participant by gender, the request changes no capacity (AC4, US-26)", async () => {
    // The men's bed went to the first MALE application above; the women's bed is still free.
    const first = (await (
      await submit([participant("FEMALE", { individualAccommodation: true })])
    ).json()) as SubmitBody
    expect(first.applications[0].terms[0].status).toBe("CONFIRMED")
    const second = (await (
      await submit([participant("FEMALE", { individualAccommodation: true })])
    ).json()) as SubmitBody
    expect(second.applications[0].terms[0].status).toBe("WAITLISTED")
    const confirmedMen = await prisma.applicationTerm.count({
      where: { termId, status: "CONFIRMED", application: { gender: "MALE" } },
    })
    expect(confirmedMen).toBe(1)
  })
})
