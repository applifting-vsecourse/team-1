// #737: e-mails of bulk actions go through the queue instead of the HTTP request.
import { EmailDeliveryError } from "@/core/email/interfaces/email-delivery.error"
import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { EmailQueueWorker } from "@/core/email/queue/email-queue.worker"
import { LEASE_MS, PrismaEmailJobRepository } from "@/core/email/queue/prisma-email-job.repository"
import { PrismaService } from "@/core/prisma/prisma.service"
import {
  allEmailsTo,
  api,
  connectTestPrisma,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

describe("e-mail queue (integration)", () => {
  let prisma: PrismaService
  let cookie: string
  let organizationId: string
  let eventId: string
  let termId: string
  let counter = 0

  const addApplications = async (count: number): Promise<{ id: string; email: string }[]> => {
    const added: { id: string; email: string }[] = []
    for (let index = 0; index < count; index++) {
      const email = `queue-${++counter}-${Date.now()}@example.com`
      const { id } = await prisma.application.create({
        data: {
          organizationId,
          eventId,
          accessToken: `queue-${counter}-${Date.now()}`,
          firstName: "Test",
          lastName: `Applicant${counter}`,
          birthDate: new Date("2010-01-01"),
          gender: "MALE",
          email,
          consentAt: new Date(),
          terms: { create: [{ organizationId, termId, status: "TO_EVALUATE", priceCzk: 1000 }] },
        },
      })
      added.push({ id, email })
    }
    return added
  }
  const post = (path: string, body: unknown) =>
    fetch(api(`/organizer/events/${eventId}/terms/${termId}/${path}`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    })
  const jobsOf = (applications: { id: string }[]) =>
    prisma.emailJob.findMany({
      where: { applicationId: { in: applications.map((row) => row.id) } },
      orderBy: { createdAt: "asc" },
    })
  const waitUntilSent = async (applications: { id: string }[], count: number) => {
    const deadline = Date.now() + 20_000
    for (;;) {
      const jobs = await jobsOf(applications)
      if (jobs.filter((job) => job.status === "SENT").length >= count) return jobs
      if (Date.now() > deadline) throw new Error("The queue did not send the e-mails in time")
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
      include: { memberships: true },
    })
    organizationId = organizer.memberships[0].organizationId
    const event = await prisma.event.create({
      data: {
        organizationId,
        name: "Queue",
        publicToken: "email-queue-event",
        terms: {
          create: [
            {
              organizationId,
              number: 1,
              name: "T1",
              rooms: { create: [{ organizationId, name: "A", capacity: 50, gender: "MALE" }] },
              startsOn: new Date("2027-07-01"),
              endsOn: new Date("2027-07-08"),
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
    await prisma?.$disconnect()
  })

  describe("in the running server", () => {
    let applications: { id: string; email: string }[]

    it("answers a bulk action before the e-mails are out and sends each exactly once", async () => {
      applications = await addApplications(15)
      const body = { decision: "WAITLIST", applicationIds: applications.map((row) => row.id) }

      expect((await post("bulk-decision", body)).status).toBe(200)

      // The worker pauses between e-mails, so 15 of them take seconds: the answer did not wait.
      const queued = await jobsOf(applications)
      expect(queued).toHaveLength(15)
      expect(queued.some((job) => job.status !== "SENT")).toBe(true)

      const sent = await waitUntilSent(applications, 15)
      for (const job of sent) {
        expect(job).toMatchObject({ attempts: 1, payload: null, html: null, subject: null })
      }
      // The same request again changes nothing, so nothing more is queued or sent.
      expect((await post("bulk-decision", body)).status).toBe(200)
      expect(await jobsOf(applications)).toHaveLength(15)
      await new Promise((resolve) => setTimeout(resolve, 500))
      for (const { email } of applications) expect(allEmailsTo(email)).toHaveLength(1)
    })

    it("queues one e-mail per applicant when a term is cancelled", async () => {
      const response = await post("cancel", { reason: "Storm" })
      expect(response.status).toBeLessThan(300)

      const jobs = await waitUntilSent(applications, 30)
      const cancelled = jobs.filter((job) => job.template === "TERM_CANCELLED")
      expect(cancelled.map((job) => job.recipient).sort()).toEqual(
        applications.map((row) => row.email).sort(),
      )
      await new Promise((resolve) => setTimeout(resolve, 500))
      for (const { email } of applications) expect(allEmailsTo(email)).toHaveLength(2)
    })
  })

  // The server runs without the queue timer and nobody calls it here, so only these workers send.
  describe("worker over the database", () => {
    const provider = (
      send: (to: string) => void = () => undefined,
    ): EmailService & { sent: string[] } => {
      const sent: string[] = []
      return {
        sent,
        sendEmail: async (to) => {
          send(to)
          sent.push(to)
        },
      }
    }
    const worker = (email: EmailService) =>
      new EmailQueueWorker(
        new PrismaEmailJobRepository(prisma),
        email,
        async () => ({ subject: "Subject", html: "<p>Body</p>" }),
        0,
      )
    const enqueue = async (count: number) => {
      await prisma.emailJob.deleteMany()
      const applications = await addApplications(count)
      const repository = new PrismaEmailJobRepository(prisma)
      const jobs = applications.map(({ id, email }) => ({
        organizationId,
        eventId,
        applicationId: id,
        template: "APPLICATION_CHANGE" as const,
        recipient: email,
        locale: "cs" as const,
        dedupeKey: `test:${id}`,
        data: { email },
      }))
      await prisma.$transaction((tx) => repository.enqueue(tx, jobs))
      // A second write of the same event adds nothing.
      await prisma.$transaction((tx) => repository.enqueue(tx, jobs))
      return applications
    }
    const later = (ms: number) => () => new Date(Date.now() + ms)

    it("records a provider failure, keeps the change and sends once after a restart", async () => {
      const [application] = await enqueue(1)
      const down = provider(() => {
        throw new EmailDeliveryError("Provider is down", "NOT_SENT")
      })

      await worker(down).drain()

      expect((await jobsOf([application]))[0]).toMatchObject({
        status: "PENDING",
        attempts: 1,
        lastError: "Provider is down",
      })
      expect(await prisma.application.count({ where: { id: application.id } })).toBe(1)

      const up = provider()
      await worker(up).drain()
      expect(up.sent).toEqual([])
      await worker(up).drain(later(2 * 60_000))
      await worker(up).drain(later(60 * 60_000))
      expect(up.sent).toEqual([application.email])
      expect((await jobsOf([application]))[0]).toMatchObject({ status: "SENT", attempts: 2 })
    })

    it("sends each job once when two workers run at the same time", async () => {
      const applications = await enqueue(10)
      const email = provider()

      await Promise.all([worker(email).drain(), worker(email).drain()])

      expect([...email.sent].sort()).toEqual(applications.map((row) => row.email).sort())
    })

    it("does not repeat a send a stopped worker may have made, without an idempotent provider", async () => {
      const [application] = await enqueue(1)
      const jobs = new PrismaEmailJobRepository(prisma)
      const claimed = await jobs.claimNext(new Date())
      await jobs.saveContent(claimed!.id, { subject: "Subject", html: "<p>Body</p>" })
      const email = provider()

      await worker(email).drain()
      expect((await jobsOf([application]))[0].status).toBe("SENDING")
      await worker(email).drain(later(LEASE_MS + 1_000))

      expect(email.sent).toEqual([])
      expect((await jobsOf([application]))[0].status).toBe("UNCERTAIN")
    })
  })
})
