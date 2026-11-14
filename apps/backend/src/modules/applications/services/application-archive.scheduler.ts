import { ApplicationArchiveService } from "@/modules/applications/services/application-archive.service"
import { Config } from "@/shared/config/config.service"
import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common"

/**
 * Runs `ApplicationArchiveService` shortly after start and then every
 * `APPLICATION_ARCHIVE_INTERVAL_MS` (default an hour; 0 switches it off). The repo has no scheduler
 * library, and a timer is enough because the job is idempotent and safe across instances.
 */
@Injectable()
export class ApplicationArchiveScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ApplicationArchiveScheduler.name)
  private timer?: NodeJS.Timeout
  private isRunning = false

  constructor(
    private readonly archive: ApplicationArchiveService,
    private readonly config: Config,
  ) {}

  onApplicationBootstrap(): void {
    const interval = this.config.applicationArchiveIntervalMs
    if (interval <= 0) return
    this.timer = setInterval(() => void this.run(), interval)
    this.timer.unref()
    setTimeout(() => void this.run(), 5_000).unref()
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer)
  }

  private async run(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true
    try {
      const archived = await this.archive.archiveFinished()
      if (archived > 0) this.logger.log(`Archived ${archived} paid application(s)`)
    } catch (error) {
      this.logger.error(
        `Application archiving failed: ${error instanceof Error ? error.message : error}`,
      )
    } finally {
      this.isRunning = false
    }
  }
}
