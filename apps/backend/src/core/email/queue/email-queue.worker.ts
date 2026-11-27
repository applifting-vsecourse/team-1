import { EmailDeliveryError } from "@/core/email/interfaces/email-delivery.error"
import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { afterFailure, canSendSafely } from "@/core/email/queue/delivery-policy"
import {
  ClaimedEmailJob,
  EmailContent,
  EmailJobRepository,
} from "@/core/email/queue/email-job.repository"
import { Logger } from "@nestjs/common"

/** About 5 e-mails a second; Resend allows 10 requests a second for the whole team. */
const SEND_PAUSE_MS = 200

export type EmailJobRenderer = (job: ClaimedEmailJob) => Promise<EmailContent>

/** Sends the queued e-mails one by one. A failure is recorded on its job and never thrown. */
export class EmailQueueWorker {
  private readonly logger = new Logger(EmailQueueWorker.name)

  constructor(
    private readonly jobs: EmailJobRepository,
    private readonly email: EmailService,
    private readonly render: EmailJobRenderer,
    private readonly pauseMs = SEND_PAUSE_MS,
  ) {}

  /** Works until nothing is due. */
  async drain(clock: () => Date = () => new Date()): Promise<void> {
    for (let job = await this.jobs.claimNext(clock()); job;) {
      await this.deliver(job, clock())
      await new Promise((resolve) => setTimeout(resolve, this.pauseMs))
      job = await this.jobs.claimNext(clock())
    }
  }

  private async deliver(job: ClaimedEmailJob, now: Date): Promise<void> {
    const isProviderIdempotent = this.email.isIdempotent === true
    const mayHaveBeenSent = job.mayHaveBeenSent || job.isAbandoned
    const { firstAttemptAt } = job
    if (!canSendSafely({ mayHaveBeenSent, firstAttemptAt, isProviderIdempotent, now })) {
      await this.jobs.giveUp(job.id, "UNCERTAIN", "The result of an earlier attempt is unknown")
      this.logger.error(`Not repeating an e-mail to ${job.recipient}: it may have been sent`)
      return
    }

    let content = job.content
    try {
      if (!content) {
        content = await this.render(job)
        await this.jobs.saveContent(job.id, content)
      }
    } catch (error) {
      await this.recordFailure(job, error, "NOT_SENT", mayHaveBeenSent, now)
      return
    }

    try {
      await this.email.sendEmail(job.recipient, content.subject, content.html, {
        idempotencyKey: job.dedupeKey,
      })
    } catch (error) {
      const outcome = error instanceof EmailDeliveryError ? error.outcome : "UNKNOWN"
      await this.recordFailure(job, error, outcome, mayHaveBeenSent, now)
      return
    }
    // Outside the try: when this write fails, the job stays claimed and counts as abandoned.
    await this.jobs.markSent(job.id, now)
  }

  private async recordFailure(
    job: ClaimedEmailJob,
    error: unknown,
    outcome: EmailDeliveryError["outcome"],
    mayHaveBeenSent: boolean,
    now: Date,
  ): Promise<void> {
    const reason = error instanceof Error ? error.message : "unknown error"
    const verdict = afterFailure({
      attempts: job.attempts,
      outcome,
      mayHaveBeenSent,
      isProviderIdempotent: this.email.isIdempotent === true,
      now,
    })
    this.logger.error(
      `E-mail to ${job.recipient} failed (attempt ${job.attempts}, ${verdict.status}): ${reason}`,
    )
    if (verdict.status === "PENDING") {
      const { nextAttemptAt } = verdict
      await this.jobs.scheduleRetry(job.id, {
        nextAttemptAt,
        mayHaveBeenSent: verdict.mayHaveBeenSent,
        error: reason,
      })
    } else {
      await this.jobs.giveUp(job.id, verdict.status, reason)
    }
  }
}
