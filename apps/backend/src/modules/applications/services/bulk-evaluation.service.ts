import { inReceiptOrder } from "@/modules/applications/domain/bulk-confirmation"
import { planBulkEvaluation } from "@/modules/applications/domain/bulk-evaluation"
import { computeAvailablePlaces, countByGender } from "@/modules/applications/domain/capacity"
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

export type GenderBreakdown = { total: number; byGender: GenderCounts }

export type BulkEvaluationPreview = {
  /** Selected applications that are still waiting for evaluation in the term. */
  selected: GenderBreakdown
  confirm: GenderBreakdown
  waitlist: GenderBreakdown
  freePlaces: GenderCounts
  /** Shared rooms: both genders draw from one pool, so the two numbers are the same. */
  isShared: boolean
}

export type BulkEvaluationResult = {
  confirmed: string[]
  waitlisted: string[]
  unchanged: string[]
}

const breakdown = (candidates: { gender: "FEMALE" | "MALE" }[]): GenderBreakdown => ({
  total: candidates.length,
  byGender: countByGender(candidates),
})

/**
 * Evaluates the selected applications waiting for evaluation in one term in one step (US-140):
 * the ones that fit into the free beds are confirmed, the others become substitutes, in order of
 * receipt. Capacity, the transition rules, the log and the e-mails are not repeated here: every
 * change is the single change of `TermStatusService`, as for an individual decision (US-28).
 */
@Injectable()
export class BulkEvaluationService {
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
  ): Promise<BulkEvaluationPreview> {
    const { state } = await this.load(user, eventId, termId, applicationIds)
    return this.describe(state)
  }

  async evaluate(
    user: Identity,
    eventId: string,
    termId: string,
    applicationIds: string[],
    expectedConfirmedCount: number,
  ): Promise<BulkEvaluationResult> {
    const { organizationId, state } = await this.load(user, eventId, termId, applicationIds)
    const plan = planBulkEvaluation(state.rooms, state.confirmedGenders, state.candidates)
    // The organizer saw another result (capacity changed since the preview): nothing is changed.
    if (plan.confirm.length !== expectedConfirmedCount)
      throw new AppException(HttpStatus.CONFLICT, "EVALUATION_PLAN_CHANGED")
    const toConfirm = new Set(plan.confirm)
    const result: BulkEvaluationResult = { confirmed: [], waitlisted: [], unchanged: [] }
    const waiting = new Set(state.candidates.map((row) => row.applicationId))
    result.unchanged.push(...[...new Set(applicationIds)].filter((id) => !waiting.has(id)))
    for (const candidate of inReceiptOrder(state.candidates)) {
      const change = (to: "CONFIRMED" | "WAITLISTED") =>
        this.statuses.applyChange({
          organizationId,
          applicationId: candidate.applicationId,
          termId,
          to,
          actorId: user.id,
          isOverCapacityConfirmed: false,
          // Somebody may have decided the application meanwhile: that decision stays.
          expectedFrom: "TO_EVALUATE",
        })
      try {
        if (toConfirm.has(candidate.applicationId)) {
          try {
            await change("CONFIRMED")
            result.confirmed.push(candidate.applicationId)
            continue
          } catch (error) {
            // The bed went meanwhile (checked under the event lock): the server decides, so
            // the application goes to the waitlist instead.
            if (!isConflict(error)) throw error
          }
        }
        await change("WAITLISTED")
        result.waitlisted.push(candidate.applicationId)
      } catch (error) {
        // Somebody else decided meanwhile (checked under the event lock): stays as it is.
        if (!isConflict(error)) throw error
        result.unchanged.push(candidate.applicationId)
      }
    }
    return result
  }

  private describe(state: BulkTermState): BulkEvaluationPreview {
    const plan = planBulkEvaluation(state.rooms, state.confirmedGenders, state.candidates)
    const byId = new Map(state.candidates.map((row) => [row.applicationId, row]))
    const pick = (ids: string[]) => breakdown(ids.map((id) => byId.get(id)!))
    return {
      selected: breakdown(state.candidates),
      confirm: pick(plan.confirm),
      waitlist: pick(plan.waitlist),
      freePlaces: computeAvailablePlaces(state.rooms, state.confirmedGenders),
      isShared: state.rooms.some((room) => room.gender === null),
    }
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

const isConflict = (error: unknown): boolean =>
  error instanceof HttpException && error.getStatus() === HttpStatus.CONFLICT
