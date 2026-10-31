import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import { TermStatusRepository } from "@/modules/applications/repositories/term-status.repository"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable, Logger } from "@nestjs/common"

/**
 * US-106: cancels the applications of waitlisted participants on the first day of their term.
 * Safe to run any number of times, also from several instances at once: every cancellation goes
 * through `TermStatusService.applyChange`, which re-reads the status under the event lock and
 * lets the system move only a waitlisted application. The loser of a race gets a 409 (already
 * cancelled or confirmed meanwhile) and sends no e-mail.
 */
@Injectable()
export class WaitlistExpiryService {
  private readonly logger = new Logger(WaitlistExpiryService.name)

  constructor(
    private readonly repository: TermStatusRepository,
    private readonly termStatus: TermStatusService,
  ) {}

  /** Returns how many applications this run cancelled. */
  async cancelExpired(now: Date = new Date()): Promise<number> {
    const entries = await this.repository.findWaitlistedStartedBy(todayInPrague(now))
    let cancelled = 0
    for (const entry of entries) {
      try {
        await this.termStatus.applyChange({
          ...entry,
          to: "CANCELLED",
          actorId: null,
          isOverCapacityConfirmed: false,
        })
        cancelled += 1
      } catch (error) {
        // Changed by someone else since it was read: nothing left to do for this one.
        if (error instanceof AppException && isConflictOrGone(error)) continue
        this.logger.error(
          `Could not cancel application ${entry.applicationId} in term ${entry.termId}: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        )
      }
    }
    return cancelled
  }
}

function isConflictOrGone(error: AppException): boolean {
  const status = error.getStatus()
  return status === HttpStatus.CONFLICT || status === HttpStatus.NOT_FOUND
}
