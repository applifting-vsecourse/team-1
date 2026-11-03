import {
  BulkConfirmationPlan,
  inReceiptOrder,
  planBulkConfirmation,
} from "@/modules/applications/domain/bulk-confirmation"
import { computeAvailablePlaces } from "@/modules/applications/domain/capacity"
import {
  BulkConfirmationRepository,
  BulkTermState,
} from "@/modules/applications/repositories/bulk-confirmation.repository"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { Identity } from "@/shared/auth/domain/identity"
import { GenderCounts } from "@/shared/domain/gender"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpException, HttpStatus, Injectable } from "@nestjs/common"

export type BulkConfirmationPreview = BulkConfirmationPlan & {
  selectedCount: number
  freePlaces: GenderCounts
  /** Shared rooms: both genders draw from one pool, so the two numbers are the same. */
  isShared: boolean
  names: Record<string, string>
}

export type BulkConfirmationResult = { confirmed: string[]; unchanged: string[] }

/**
 * Confirms many applications waiting for evaluation in one term (US-107). Capacity, the
 * transition rules, the log and the e-mails are not repeated here: every confirmation is the
 * single change of `TermStatusService`, in order of receipt, without the over-capacity override.
 */
@Injectable()
export class BulkConfirmationService {
  constructor(
    private readonly repository: BulkConfirmationRepository,
    private readonly access: OrganizationAccessService,
    private readonly statuses: TermStatusService,
  ) {}

  async preview(
    user: Identity,
    eventId: string,
    termId: string,
    applicationIds: string[],
  ): Promise<BulkConfirmationPreview> {
    const { state } = await this.load(user, eventId, termId, applicationIds)
    const plan = planBulkConfirmation(state.rooms, state.confirmedGenders, state.candidates)
    return {
      ...plan,
      selectedCount: new Set(applicationIds).size,
      freePlaces: computeAvailablePlaces(state.rooms, state.confirmedGenders),
      isShared: state.rooms.some((room) => room.gender === null),
      names: Object.fromEntries(
        state.candidates.map((row) => [row.applicationId, `${row.firstName} ${row.lastName}`]),
      ),
    }
  }

  async confirm(
    user: Identity,
    eventId: string,
    termId: string,
    applicationIds: string[],
  ): Promise<BulkConfirmationResult> {
    const { organizationId, state } = await this.load(user, eventId, termId, applicationIds)
    const result: BulkConfirmationResult = { confirmed: [], unchanged: [] }
    const waiting = new Set(state.candidates.map((row) => row.applicationId))
    result.unchanged.push(...[...new Set(applicationIds)].filter((id) => !waiting.has(id)))
    for (const candidate of inReceiptOrder(state.candidates)) {
      try {
        await this.statuses.applyChange({
          organizationId,
          applicationId: candidate.applicationId,
          termId,
          to: "CONFIRMED",
          actorId: user.id,
          isOverCapacityConfirmed: false,
        })
        result.confirmed.push(candidate.applicationId)
      } catch (error) {
        // No bed left (checked under the event lock) or no longer waiting: stays as it is.
        if (!(error instanceof HttpException) || error.getStatus() !== HttpStatus.CONFLICT)
          throw error
        result.unchanged.push(candidate.applicationId)
      }
    }
    return result
  }

  private async load(
    user: Identity,
    eventId: string,
    termId: string,
    applicationIds: string[],
  ): Promise<{ organizationId: string; state: BulkTermState }> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const state = await this.repository.findTermState(
      organizationId,
      eventId,
      termId,
      applicationIds,
    )
    if (!state) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return { organizationId, state }
  }
}
