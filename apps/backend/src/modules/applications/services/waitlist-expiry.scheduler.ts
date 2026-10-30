import { WaitlistExpiryService } from "@/modules/applications/services/waitlist-expiry.service"
import { Config } from "@/shared/config/config.service"
import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common"

/**
 * Runs `WaitlistExpiryService` shortly after start and then every
 * `WAITLIST_EXPIRY_INTERVAL_MS` (default an hour; 0 switches it off). The repo has no scheduler
 * library, and a timer is enough because the job is idempotent and safe across instances.
 */
@Injectable()
export class WaitlistExpiryScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(WaitlistExpiryScheduler.name)
  private timer?: NodeJS.Timeout
  private isRunning = false

  constructor(
    private readonly expiry: WaitlistExpiryService,
    private readonly config: Config,
  ) {}

  onApplicationBootstrap(): void {
    const interval = Number(this.config.waitlistExpiryIntervalMs)
    if (!Number.isFinite(interval) || interval <= 0) return
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
      const cancelled = await this.expiry.cancelExpired()
      if (cancelled > 0) this.logger.log(`Cancelled ${cancelled} waitlisted application(s)`)
    } catch (error) {
      this.logger.error(`Waitlist expiry failed: ${error instanceof Error ? error.message : error}`)
    } finally {
      this.isRunning = false
    }
  }
}
