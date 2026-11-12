import { TermChangeImpact } from "@/modules/applications/domain/organizer-term-change"
import { WithdrawalImpact } from "@/modules/applications/domain/organizer-withdrawal"
import {
  ParticipantChangeOptions,
  ParticipantTermChangeResult,
} from "@/modules/applications/domain/participant-term-change"
import {
  changeEmailKind,
  rejectStatusChange,
} from "@/modules/applications/domain/status-transition"
import { proposedSubstitutes } from "@/modules/applications/domain/substitutes"
import {
  StatusChangeCommand,
  StatusChangeResult,
  SubstituteRecord,
  TermStatusDetail,
} from "@/modules/applications/domain/term-status"
import { SubstitutesRepository } from "@/modules/applications/repositories/substitutes.repository"
import { TermStatusRepository } from "@/modules/applications/repositories/term-status.repository"
import { ApplicationConfirmationMailer } from "@/modules/participants/services/application-confirmation-mailer.service"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable, Logger } from "@nestjs/common"

/**
 * The one service that changes the status of an application in a term (US-28).
 * Later stories (waitlist, cancellation, manual add) call `applyChange` too,
 * with `actorId: null` when the system acts, so the log and the e-mail stay in
 * one place.
 */
@Injectable()
export class TermStatusService {
  private readonly logger = new Logger(TermStatusService.name)

  constructor(
    private readonly repository: TermStatusRepository,
    private readonly substitutes: SubstitutesRepository,
    private readonly access: OrganizationAccessService,
    private readonly mailer: ApplicationConfirmationMailer,
  ) {}

  async participantChangeOptions(
    user: Identity,
    applicationId: string,
  ): Promise<ParticipantChangeOptions> {
    const options = await this.repository.participantChangeOptions(user.id, applicationId)
    if (!options) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return options
  }

  /** Before the cancellation start, the participant's selection takes effect in the same request. */
  async changeByParticipant(
    user: Identity,
    applicationId: string,
    termIds: string[],
  ): Promise<ParticipantTermChangeResult> {
    const change = await this.repository.changeParticipantTerms(user.id, applicationId, termIds)
    if (change === undefined) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    if (change) await this.mailer.sendApplicationChange(change)
    await this.fillFreedBeds(change?.freedTermIds ?? [])
    return { addedTerms: change?.addedTerms ?? [] }
  }

  /** Terms of the event an organizer can put the application in (US-33). */
  async changeOptionsForOrganizer(
    user: Identity,
    applicationId: string,
  ): Promise<ParticipantChangeOptions> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const options = await this.repository.organizerChangeOptions(organizationId, applicationId)
    if (!options) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return options
  }

  /** What an organizer's change of terms would do, before it is saved (US-33). */
  async previewChangeByOrganizer(
    user: Identity,
    applicationId: string,
    termIds: string[],
  ): Promise<TermChangeImpact> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const impact = await this.repository.previewTermChange(organizationId, applicationId, termIds)
    if (!impact) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return impact
  }

  /**
   * An organizer changes the terms of an application (US-33) in the same transaction as the
   * participant's own change; a term without a free bed needs `isOverCapacityConfirmed`.
   * Tells the applicant by one e-mail about the change.
   */
  async changeTermsByOrganizer(
    user: Identity,
    applicationId: string,
    termIds: string[],
    isOverCapacityConfirmed: boolean,
  ): Promise<{ changed: boolean; changedAt: Date; changedByName: string | null }> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const change = await this.repository.changeTermsByOrganizer(
      organizationId,
      applicationId,
      termIds,
      user.id,
      isOverCapacityConfirmed,
    )
    if (change === undefined) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    if (change) await this.mailer.sendApplicationChange(change)
    await this.fillFreedBeds(change?.freedTermIds ?? [])
    return { changed: change !== null, changedAt: new Date(), changedByName: user.name }
  }

  /** What a withdrawal entered by an organizer would do to the money, before it is saved (US-32). */
  async previewWithdrawalByOrganizer(
    user: Identity,
    applicationId: string,
    termIds: string[],
  ): Promise<WithdrawalImpact> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const impact = await this.repository.previewWithdrawal(organizationId, applicationId, termIds)
    if (!impact) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return impact
  }

  /**
   * An organizer withdraws the participant from the given terms (US-32): the terms become
   * cancelled, the change is logged with the organizer and the applicant gets one e-mail.
   */
  async withdrawByOrganizer(
    user: Identity,
    applicationId: string,
    termIds: string[],
  ): Promise<{ changedAt: Date; changedByName: string | null }> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const change = await this.repository.withdrawTermsByOrganizer(
      organizationId,
      applicationId,
      termIds,
      user.id,
    )
    if (change === undefined) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    // The mailer logs a failed delivery itself and never throws.
    if (change) await this.mailer.sendApplicationChange(change)
    await this.fillFreedBeds(change?.freedTermIds ?? [])
    return { changedAt: new Date(), changedByName: user.name }
  }

  async getTerms(user: Identity, applicationId: string): Promise<TermStatusDetail[]> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    return this.repository.findTerms(applicationId, organizationId)
  }

  /** Records of confirmations from the waitlist in a term of an event (US-105), newest first. */
  async getSubstituteRecords(
    user: Identity,
    eventId: string,
    termId: string,
  ): Promise<SubstituteRecord[]> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const records = await this.repository.findSubstituteRecords(organizationId, eventId, termId)
    if (!records) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return records
  }

  /** An organizer changes the status by hand; the acting user comes from the session. */
  async changeByOrganizer(
    user: Identity,
    applicationId: string,
    termId: string,
    to: StatusChangeCommand["to"],
    isOverCapacityConfirmed: boolean,
  ): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    await this.applyChange({
      organizationId,
      applicationId,
      termId,
      to,
      actorId: user.id,
      isOverCapacityConfirmed,
    })
  }

  /** Stores the change with its log entry and tells the applicant. */
  async applyChange(command: StatusChangeCommand): Promise<StatusChangeResult> {
    const result = await this.repository.changeStatus(command, (snapshot) => {
      const actor = command.actorId === null ? "SYSTEM" : "ORGANIZER"
      const rejection = rejectStatusChange(
        snapshot,
        command.to,
        command.isOverCapacityConfirmed,
        actor,
      )
      if (rejection) throw new AppException(HttpStatus.CONFLICT, rejection)
    })
    if (!result) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    // The mailer logs a failed delivery itself and never throws.
    await this.mailer.sendApplicationChange({
      email: result.email,
      locale: result.locale,
      eventName: result.eventName,
      organizationName: result.organizationName,
      termName: result.termName,
      gender: result.gender,
      bankAccount: result.bankAccount,
      kind: changeEmailKind(
        result.to,
        result.from,
        command.actorId === null ? "SYSTEM" : "ORGANIZER",
      ),
      application: result.application,
      // Payment details only where the application became confirmed (EMAILY.md, rows 2 and 5).
      isAmountChanged: result.to === "CONFIRMED",
    })
    // A confirmed participant giving up the bed (cancelled, put on the waitlist) frees it (US-31).
    // The one moved to the waitlist does not take the bed it has just given up (organizer's decision).
    if (result.from === "CONFIRMED") {
      await this.fillFreedBeds([command.termId], { except: command.applicationId })
    }
    return result
  }

  /**
   * US-31: in the automatic evaluation mode the system confirms the first eligible substitute of
   * every bed group that has a free bed, one after another, until no bed or substitute is left;
   * the applicant gets the e-mail with payment details of the one status change. In the manual
   * mode it does nothing: the organizer is shown the proposal and confirms it (US-104).
   *
   * Every confirmation is `applyChange`, which locks the event and checks the beds again, so two
   * runs at once (or a submission for the last bed) never confirm two for one bed: the loser
   * finds the bed taken or the application no longer waiting and reads the state again. Runs
   * after the transaction that freed the bed; a failure is logged, it never fails that request.
   */
  async fillFreedBeds(termIds: string[], options: { except?: string } = {}): Promise<void> {
    for (const termId of new Set(termIds)) {
      try {
        await this.fillTerm(termId, options.except)
      } catch (error) {
        this.logger.error(`Filling freed beds of term ${termId} failed`, error)
      }
    }
  }

  private async fillTerm(termId: string, except?: string): Promise<void> {
    let budget = 0
    do {
      const state = await this.substitutes.findTermStateById(termId)
      if (!state || state.isCancelled || state.evaluationMode !== "AUTOMATIC") return
      // Each round confirms one, so the waitlist length bounds the rounds even if a round loses.
      if (budget === 0) budget = state.waitlisted.length + 1
      const [next] = proposedSubstitutes(
        state,
        state.waitlisted.filter((row) => row.applicationId !== except),
      )
      if (!next) return
      try {
        await this.applyChange({
          organizationId: state.organizationId,
          applicationId: next.applicationId,
          termId,
          to: "CONFIRMED",
          actorId: null,
          isOverCapacityConfirmed: false,
        })
      } catch (error) {
        // Someone else took the bed or the application, read the state again.
        const isLost =
          error instanceof AppException &&
          (error.code === "CAPACITY_EXCEEDED" || error.code === "INVALID_STATUS_TRANSITION")
        if (!isLost) throw error
      }
    } while (--budget > 0)
  }
}
