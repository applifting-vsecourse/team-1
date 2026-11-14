import { readFileSync } from "node:fs"
import { PrismaService } from "@/core/prisma/prisma.service"
import { ApplicationArchiveRepository } from "@/modules/applications/repositories/application-archive.repository"
import { ApplicationArchiveService } from "@/modules/applications/services/application-archive.service"
import { connectTestPrisma, nextTermNumber, resetAndSeed } from "@/test/integration/test-api"

describe("archiving applications after their term (integration)", () => {
  let prisma: PrismaService
  let archive: ApplicationArchiveService
  let organizationId: string
  let sequence = 0
  let recordedById: string

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    await prisma.applicationTerm.updateMany({
      where: { status: "CONFIRMED" },
      data: { status: "TO_EVALUATE" },
    })
    organizationId = (await prisma.organization.findFirstOrThrow()).id
    recordedById = (await prisma.user.findFirstOrThrow()).id
    archive = new ApplicationArchiveService(new ApplicationArchiveRepository(prisma))
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it.each(["MANUAL", "AUTOMATIC"] as const)(
    "archives only paid confirmed finished terms in %s mode, once and without e-mail",
    async (evaluationMode) => {
      const event = await prisma.event.create({
        data: {
          organizationId,
          name: `Archive ${evaluationMode}`,
          publicToken: `archive-${evaluationMode}`,
          evaluationMode,
        },
      })
      const add = async (
        status: "CONFIRMED" | "CANCELLED" | "WAITLISTED" | "TO_EVALUATE",
        amountCzk: number,
        endsOn = "2090-07-01",
        cancelledAt: Date | null = null,
        priceCzk = 1000,
        paymentCancelled = false,
      ) => {
        const term = await prisma.term.create({
          data: {
            organizationId,
            eventId: event.id,
            number: await nextTermNumber(prisma, event.id),
            name: "Archive term",
            startsOn: new Date("2090-06-01"),
            endsOn: new Date(endsOn),
            priceCzk,
            cancelledAt,
          },
        })
        const app = await prisma.application.create({
          data: {
            organizationId,
            eventId: event.id,
            accessToken: `archive-${++sequence}`,
            firstName: "Test",
            lastName: "Archive",
            email: `archive-${sequence}@example.com`,
            birthDate: new Date("2010-01-01"),
            gender: "FEMALE",
            consentAt: new Date(),
            terms: { create: { organizationId, termId: term.id, status, priceCzk } },
          },
          include: { terms: true },
        })
        const applicationTerm = app.terms[0]
        if (amountCzk)
          await prisma.payment.create({
            data: {
              organizationId,
              receiptId: `archive-receipt-${sequence}`,
              recordedById,
              applicationTermId: applicationTerm.id,
              amountCzk,
              cancelledAt: paymentCancelled ? new Date() : null,
            },
          })
        return applicationTerm.id
      }
      const paid = await add("CONFIRMED", 1000)
      const overpaid = await add("CONFIRMED", 1100)
      const free = await add("CONFIRMED", 0, undefined, null, 0)
      const raced = await add("CONFIRMED", 1000)
      const excluded = [
        raced,
        await add("CONFIRMED", 999),
        await add("CANCELLED", 1000),
        await add("WAITLISTED", 1000),
        await add("TO_EVALUATE", 1000),
        await add("CONFIRMED", 1000, "2090-07-02"),
        await add("CONFIRMED", 1000, undefined, new Date()),
        await add("CONFIRMED", 1000, undefined, null, 1000, true),
      ]
      const before = await prisma.applicationTerm.findMany({
        where: { id: { in: excluded } },
        select: { id: true, status: true },
      })
      const mailBefore = readFileSync(process.env.TEST_MAIL_LOG!, "utf8")
      // An in-flight payment removal must commit before the archival reads its balance.
      const racedTerm = await prisma.applicationTerm.findUniqueOrThrow({ where: { id: raced } })
      let release!: () => void
      let locked!: () => void
      const held = new Promise<void>((resolve) => {
        release = resolve
      })
      const ready = new Promise<void>((resolve) => {
        locked = resolve
      })
      const cancellation = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM application WHERE id = ${racedTerm.applicationId} FOR UPDATE`
        await tx.payment.updateMany({
          where: { applicationTermId: raced },
          data: { cancelledAt: new Date() },
        })
        locked()
        await held
      })
      await ready
      let finished = false
      const concurrent = Promise.all([
        archive.archiveFinished(new Date("2090-07-01T22:00:00Z")),
        archive.archiveFinished(new Date("2090-07-01T22:00:00Z")),
      ]).then((counts) => {
        finished = true
        return counts
      })
      try {
        let waiting = false
        for (let attempt = 0; attempt < 40 && !waiting; attempt++) {
          const [state] = await prisma.$queryRaw<{ waiting: boolean }[]>`
            SELECT EXISTS (
              SELECT 1 FROM pg_stat_activity
              WHERE datname = current_database() AND wait_event_type = 'Lock'
                AND query LIKE 'SELECT id FROM application WHERE "eventId" = %'
            ) AS waiting`
          waiting = state.waiting
          if (!waiting) await new Promise((resolve) => setTimeout(resolve, 25))
        }
        expect(waiting).toBe(true)
        expect(finished).toBe(false)
      } finally {
        release()
      }
      await cancellation
      const counts = await concurrent
      expect(counts.reduce((a, b) => a + b, 0)).toBe(3)
      expect(await archive.archiveFinished(new Date("2090-07-01T22:00:00Z"))).toBe(0)
      expect(
        await prisma.applicationTerm.findMany({
          where: { id: { in: excluded } },
          select: { id: true, status: true },
        }),
      ).toEqual(before)
      for (const id of [paid, overpaid, free]) {
        expect((await prisma.applicationTerm.findUniqueOrThrow({ where: { id } })).status).toBe(
          "ARCHIVED",
        )
        expect(
          await prisma.applicationTermStatusChange.findMany({ where: { applicationTermId: id } }),
        ).toEqual([
          expect.objectContaining({
            fromStatus: "CONFIRMED",
            toStatus: "ARCHIVED",
            changedById: null,
            organizationId,
          }),
        ])
      }
      // A concurrent extension or cancellation must commit before the archival reads term dates.
      const extended = await add("CONFIRMED", 1000)
      const cancelled = await add("CONFIRMED", 1000)
      const extendedRow = await prisma.applicationTerm.findUniqueOrThrow({
        where: { id: extended },
      })
      const cancelledRow = await prisma.applicationTerm.findUniqueOrThrow({
        where: { id: cancelled },
      })
      let releaseTerms!: () => void
      let termsLocked!: () => void
      const termsHeld = new Promise<void>((resolve) => {
        releaseTerms = resolve
      })
      const termsReady = new Promise<void>((resolve) => {
        termsLocked = resolve
      })
      const edits = prisma.$transaction(async (tx) => {
        await tx.term.update({
          where: { id: extendedRow.termId },
          data: { endsOn: new Date("2090-07-03") },
        })
        await tx.term.update({
          where: { id: cancelledRow.termId },
          data: { cancelledAt: new Date() },
        })
        termsLocked()
        await termsHeld
      })
      await termsReady
      const afterEdits = archive.archiveFinished(new Date("2090-07-01T22:00:00Z"))
      try {
        let waiting = false
        for (let attempt = 0; attempt < 40 && !waiting; attempt++) {
          const [state] = await prisma.$queryRaw<{ waiting: boolean }[]>`
            SELECT EXISTS (
              SELECT 1 FROM pg_stat_activity
              WHERE datname = current_database() AND wait_event_type = 'Lock'
                AND query LIKE 'SELECT id FROM term WHERE "eventId" = %'
            ) AS waiting`
          waiting = state.waiting
          if (!waiting) await new Promise((resolve) => setTimeout(resolve, 25))
        }
        expect(waiting).toBe(true)
      } finally {
        releaseTerms()
      }
      await edits
      expect(await afterEdits).toBe(0)
      for (const id of [extended, cancelled]) {
        expect((await prisma.applicationTerm.findUniqueOrThrow({ where: { id } })).status).toBe(
          "CONFIRMED",
        )
      }
      expect(readFileSync(process.env.TEST_MAIL_LOG!, "utf8")).toBe(mailBefore)
    },
  )
})
