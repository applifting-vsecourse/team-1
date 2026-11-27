import { Locale } from "@/core/email/locale"
import { PrismaService } from "@/core/prisma/prisma.service"
import { EmailJobTemplate, Prisma } from "@/generated/prisma/client"
import { Injectable } from "@nestjs/common"
import { ClaimedEmailJob, EmailContent, EmailJobRepository } from "./email-job.repository"

/** Longer than one send takes; a job held longer belongs to a worker that stopped. */
export const LEASE_MS = 5 * 60_000

export type NewEmailJob = {
  organizationId: string
  eventId: string
  applicationId: string
  template: EmailJobTemplate
  recipient: string
  locale: Locale
  dedupeKey: string
  /** Template data; has to survive JSON. */
  data: object
}

/** The queue in the `email_job` table (#737). */
@Injectable()
export class PrismaEmailJobRepository extends EmailJobRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  /** In the transaction of the change, so both are stored or neither. A known key adds nothing. */
  async enqueue(tx: Prisma.TransactionClient, jobs: NewEmailJob[]): Promise<void> {
    if (!jobs.length) return
    await tx.emailJob.createMany({
      data: jobs.map(({ data, ...job }) => ({ ...job, payload: data as Prisma.InputJsonValue })),
      skipDuplicates: true,
    })
  }

  async claimNext(now: Date): Promise<ClaimedEmailJob | null> {
    const abandonedBefore = new Date(now.getTime() - LEASE_MS)
    for (;;) {
      const next = await this.prisma.emailJob.findFirst({
        where: {
          OR: [
            { status: "PENDING", nextAttemptAt: { lte: now } },
            { status: "SENDING", lockedAt: { lte: abandonedBefore } },
          ],
        },
        orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      })
      if (!next) return null
      const attempts = next.attempts + 1
      const firstAttemptAt = next.firstAttemptAt ?? now
      // Compare and swap: of two workers that read the same job only one finds it unchanged.
      const { count } = await this.prisma.emailJob.updateMany({
        where: { id: next.id, status: next.status, attempts: next.attempts },
        data: { status: "SENDING", attempts, lockedAt: now, firstAttemptAt },
      })
      if (count === 0) continue
      return {
        id: next.id,
        dedupeKey: next.dedupeKey,
        recipient: next.recipient,
        payload: { template: next.template, data: next.payload },
        content:
          next.subject !== null && next.html !== null
            ? { subject: next.subject, html: next.html }
            : null,
        attempts,
        firstAttemptAt,
        mayHaveBeenSent: next.mayHaveBeenSent,
        isAbandoned: next.status === "SENDING",
      }
    }
  }

  // `updateMany` below: the application, and with it the job, may be deleted meanwhile.

  async saveContent(id: string, content: EmailContent): Promise<void> {
    await this.prisma.emailJob.updateMany({ where: { id }, data: content })
  }

  async markSent(id: string, sentAt: Date): Promise<void> {
    await this.prisma.emailJob.updateMany({
      where: { id },
      data: {
        status: "SENT",
        sentAt,
        lockedAt: null,
        lastError: null,
        payload: Prisma.DbNull,
        subject: null,
        html: null,
      },
    })
  }

  async scheduleRetry(
    id: string,
    retry: { nextAttemptAt: Date; mayHaveBeenSent: boolean; error: string },
  ): Promise<void> {
    const { error, ...data } = retry
    await this.prisma.emailJob.updateMany({
      where: { id },
      data: { ...data, status: "PENDING", lockedAt: null, lastError: error },
    })
  }

  async giveUp(id: string, status: "FAILED" | "UNCERTAIN", error: string): Promise<void> {
    await this.prisma.emailJob.updateMany({
      where: { id },
      data: { status, lockedAt: null, lastError: error },
    })
  }
}
