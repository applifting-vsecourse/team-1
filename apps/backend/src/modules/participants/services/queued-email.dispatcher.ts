import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { ClaimedEmailJob } from "@/core/email/queue/email-job.repository"
import { EmailQueueWorker } from "@/core/email/queue/email-queue.worker"
import { PrismaEmailJobRepository } from "@/core/email/queue/prisma-email-job.repository"
import { QueuedEmail } from "@/modules/participants/domain/queued-email"
import { QueuedEmailRepository } from "@/modules/participants/repositories/queued-email.repository"
import { ApplicationConfirmationMailer } from "@/modules/participants/services/application-confirmation-mailer.service"
import { Config } from "@/shared/config/config.service"
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common"

/**
 * Runs the e-mail queue in the server process (#737): right after an action that added jobs
 * (`kick`) and every `EMAIL_QUEUE_INTERVAL_MS` for retries and for jobs left over by a restart
 * (0 switches the timer off).
 */
@Injectable()
export class QueuedEmailDispatcher implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(QueuedEmailDispatcher.name)
  private readonly worker: EmailQueueWorker
  private timer?: NodeJS.Timeout
  private isRunning = false
  private isRequestedAgain = false

  constructor(
    @Inject("EmailService") email: EmailService,
    jobs: PrismaEmailJobRepository,
    mailer: ApplicationConfirmationMailer,
    outdated: QueuedEmailRepository,
    private readonly config: Config,
  ) {
    // The payload was written by `queuedEmailJob`.
    const read = (job: ClaimedEmailJob) => job.payload as QueuedEmail
    this.worker = new EmailQueueWorker(
      jobs,
      email,
      (job) => mailer.renderQueued(read(job)),
      undefined,
      (job) => outdated.isOutdated(read(job)),
    )
  }

  onApplicationBootstrap(): void {
    const interval = this.config.emailQueueIntervalMs
    if (interval <= 0) return
    this.timer = setInterval(() => this.kick(), interval)
    this.timer.unref()
    setTimeout(() => this.kick(), 5_000).unref()
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer)
  }

  /** Starts sending without making the caller wait. */
  kick(): void {
    // A running drain may be past its last look at the queue: it looks once more.
    this.isRequestedAgain = true
    if (!this.isRunning) void this.run()
  }

  private async run(): Promise<void> {
    this.isRunning = true
    try {
      while (this.isRequestedAgain) {
        this.isRequestedAgain = false
        await this.worker.drain()
      }
    } catch (error) {
      this.logger.error(`E-mail queue failed: ${error instanceof Error ? error.message : error}`)
    } finally {
      this.isRunning = false
    }
  }
}
