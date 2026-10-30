import {
  changeEmailKind,
  rejectStatusChange,
} from "@/modules/applications/domain/status-transition"
import {
  StatusChangeCommand,
  StatusChangeResult,
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

  async getTerms(user: Identity, applicationId: string): Promise<TermStatusDetail[]> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    return this.repository.findTerms(applicationId, organizationId)
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
