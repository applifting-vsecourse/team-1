import { TermChangeImpact } from "@/modules/applications/domain/organizer-term-change"
import { WithdrawalImpact } from "@/modules/applications/domain/organizer-withdrawal"
import { ParticipantChangeOptions } from "@/modules/applications/domain/participant-term-change"
import {
  changeEmailKind,
  rejectStatusChange,
} from "@/modules/applications/domain/status-transition"
import {
  StatusChangeCommand,
  StatusChangeResult,
  SubstituteRecord,
  TermStatusDetail,
} from "@/modules/applications/domain/term-status"
import { TermStatusRepository } from "@/modules/applications/repositories/term-status.repository"
import { ApplicationConfirmationMailer } from "@/modules/participants/services/application-confirmation-mailer.service"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

/**
 * The one service that changes the status of an application in a term (US-28).
 * Later stories (waitlist, cancellation, manual add) call `applyChange` too,
 * with `actorId: null` when the system acts, so the log and the e-mail stay in
 * one place.
 */
@Injectable()
export class TermStatusService {
  constructor(
    private readonly repository: TermStatusRepository,
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
  ): Promise<void> {
    const change = await this.repository.changeParticipantTerms(user.id, applicationId, termIds)
    if (change === undefined) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    if (change) await this.mailer.sendApplicationChange(change)
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
    return result
  }
}
