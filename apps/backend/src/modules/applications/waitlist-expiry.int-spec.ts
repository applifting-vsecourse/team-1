// US-106: the system cancels waitlisted applications on the first day of their term. The test
// server runs the job every second (global-setup.ts), so the test only waits for the result.
import { PrismaService } from "@/core/prisma/prisma.service"
import { connectTestPrisma, resetAndSeed } from "@/test/integration/test-api"

type Status = "CONFIRMED" | "WAITLISTED" | "CANCELLED"

const pragueToday = (offsetDays = 0): Date => {
  const date = new Date(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date()) +
      "T00:00:00.000Z",
  )
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date
}

describe("cancelling waitlisted applications on the first day of the term (integration)", () => {
  let prisma: PrismaService
  let organizationId: string
  let eventId: string
  let counter = 0

  const addTerm = async (name: string, startsOn: Date, cancelledAt?: Date): Promise<string> => {
    const term = await prisma.term.create({
      data: {
        organizationId,
        eventId,
        name,
        startsOn,
        endsOn: new Date(startsOn.getTime() + 6 * 86_400_000),
        priceCzk: 1000,
        cancelledAt,
      },
    })
    return term.id
  }
  const addApplication = async (termId: string, status: Status): Promise<string> => {
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId,
        accessToken: `us-106-${++counter}-${Date.now()}`,
        firstName: "Test",
        lastName: `Applicant${counter}`,
        birthDate: new Date("2010-01-01"),
        gender: "FEMALE",
        email: `us106-${counter}@example.com`,
        consentAt: new Date(),
        terms: { create: [{ organizationId, termId, status, priceCzk: 1000 }] },
      },
    })
    return application.id
  }
  const statusOf = async (applicationId: string): Promise<Status> =>
    (await prisma.applicationTerm.findFirstOrThrow({ where: { applicationId } })).status
  const waitFor = async (check: () => Promise<boolean>): Promise<void> => {
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await check()) return
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    throw new Error("the waitlist expiry job did not run in time")
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    const organization = await prisma.organization.findFirstOrThrow()
    organizationId = organization.id
    eventId = (
      await prisma.event.create({
        data: { organizationId, name: "US-106", publicToken: "us-106-event" },
      })
    ).id
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("cancels a waitlisted application from the first day of the term, logged as the system", async () => {
    const startedTerm = await addTerm("Started", pragueToday())
    const futureTerm = await addTerm("Future", pragueToday(30))
    const cancelledTerm = await addTerm("Cancelled", pragueToday(), new Date())
    const waitlisted = await addApplication(startedTerm, "WAITLISTED")
    const confirmed = await addApplication(startedTerm, "CONFIRMED")
    const later = await addApplication(futureTerm, "WAITLISTED")
    const inCancelledTerm = await addApplication(cancelledTerm, "WAITLISTED")

    await waitFor(async () => (await statusOf(waitlisted)) === "CANCELLED")
    // Another few runs change nothing: one log entry, the others untouched.
    await new Promise((resolve) => setTimeout(resolve, 2500))

    expect(await statusOf(waitlisted)).toBe("CANCELLED")
    expect(await statusOf(confirmed)).toBe("CONFIRMED")
    expect(await statusOf(later)).toBe("WAITLISTED")
    expect(await statusOf(inCancelledTerm)).toBe("WAITLISTED")
    const log = await prisma.applicationTermStatusChange.findMany({
      where: { applicationTerm: { applicationId: waitlisted } },
    })
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({
      fromStatus: "WAITLISTED",
      toStatus: "CANCELLED",
      changedById: null,
      organizationId,
    })
  })
})
