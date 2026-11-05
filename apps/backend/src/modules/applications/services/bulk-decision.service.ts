import {
  BulkDecision,
  DECISION_TARGET,
  planBulkDecision,
} from "@/modules/applications/domain/bulk-decision"
import { BulkDecisionRepository } from "@/modules/applications/repositories/bulk-decision.repository"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpException, HttpStatus, Injectable } from "@nestjs/common"

export type BulkDecisionResult = { changed: string[]; unchanged: string[] }

/**
 * Puts many applications waiting for evaluation in one term on the waitlist, or rejects them
 * (US-108). The transition rules, the log and the e-mails are not repeated here: every change is
 * the single change of `TermStatusService`, in order of receipt. The waitlist order itself comes
 * from the time of receipt (`waitlistPositions`), not from when the change is made.
 */
@Injectable()
export class BulkDecisionService {
  constructor(
    private readonly repository: BulkDecisionRepository,
    private readonly access: OrganizationAccessService,
    private readonly statuses: TermStatusService,
  ) {}

  async decide(
    user: Identity,
    eventId: string,
    termId: string,
    decision: BulkDecision,
    applicationIds: string[],
  ): Promise<BulkDecisionResult> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const candidates = await this.repository.findCandidates(
      organizationId,
      eventId,
      termId,
      applicationIds,
    )
    if (!candidates) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    const plan = planBulkDecision(candidates, applicationIds)
    const result: BulkDecisionResult = { changed: [], unchanged: [...plan.skipped] }
    for (const applicationId of plan.changeable) {
      try {
        await this.statuses.applyChange({
          organizationId,
          applicationId,
          termId,
          to: DECISION_TARGET[decision],
          actorId: user.id,
          isOverCapacityConfirmed: false,
        })
        result.changed.push(applicationId)
      } catch (error) {
        // Somebody else decided meanwhile (checked under the event lock): stays as it is.
        if (!(error instanceof HttpException) || error.getStatus() !== HttpStatus.CONFLICT)
          throw error
        result.unchanged.push(applicationId)
      }
    }
    return result
  }
}
