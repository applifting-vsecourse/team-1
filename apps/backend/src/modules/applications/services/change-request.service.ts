import { ChangeRequest } from "@/modules/applications/domain/change-request"
import { ChangeRequestRepository } from "@/modules/applications/repositories/change-request.repository"
import { TermStatusRepository } from "@/modules/applications/repositories/term-status.repository"
import { decideHealth, HealthInput } from "@/modules/health/domain/health"
import { ApplicationConfirmationMailer } from "@/modules/participants/services/application-confirmation-mailer.service"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class ChangeRequestService {
  constructor(
    private readonly requests: ChangeRequestRepository,
    private readonly terms: TermStatusRepository,
    private readonly access: OrganizationAccessService,
    private readonly mailer: ApplicationConfirmationMailer,
  ) {}

  async submit(user: Identity, applicationId: string, termIds: string[]): Promise<ChangeRequest> {
    const request = await this.requests.create(user.id, applicationId, termIds)
    await this.mailer.sendChangeRequestStatus(request.email, {
      locale: request.locale,
      status: "PENDING",
      participantName: request.participantName,
      eventName: request.eventName,
    })
    return request
  }

  forParticipant(user: Identity, applicationId: string): Promise<ChangeRequest[]> {
    return this.requests.forParticipant(user.id, applicationId)
  }

  notificationsForParticipant(
    user: Identity,
  ): ReturnType<ChangeRequestRepository["notificationsForParticipant"]> {
    return this.requests.notificationsForParticipant(user.id)
  }

  markNotificationRead(user: Identity, requestId: string): Promise<void> {
    return this.requests.markNotificationRead(user.id, requestId)
  }

  async pendingForEvent(user: Identity, eventId: string): Promise<ChangeRequest[]> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return this.requests.pendingForEvent(organizationId, eventId)
  }

  async forOrganizer(user: Identity, eventId: string, requestId: string): Promise<ChangeRequest> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const request = await this.requests.findForOrganizer(organizationId, eventId, requestId)
    if (!request) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return request
  }

  /** US-68: a request to change health data that is already filled in. */
  async submitHealth(
    user: Identity,
    applicationId: string,
    input: HealthInput,
  ): Promise<ChangeRequest> {
    return this.requests.createHealth(user.id, applicationId, decideHealth(input))
  }

  async approve(user: Identity, eventId: string, requestId: string): Promise<void> {
    const request = await this.forOrganizer(user, eventId, requestId)
    if (request.kind === "HEALTH") {
      const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
      return this.requests.approveHealth(organizationId, eventId, requestId, user.id)
    }
    const changed = await this.terms.changeParticipantTerms(
      request.applicantId,
      request.applicationId,
      request.requestedTermIds,
      { id: request.id, reviewerId: user.id },
    )
    if (!changed) throw new AppException(HttpStatus.CONFLICT, "CHANGE_REQUEST_STALE")
    await this.mailer.sendApplicationChange(changed)
  }

  async reject(user: Identity, eventId: string, requestId: string, reason: string): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const request = await this.requests.reject(
      organizationId,
      eventId,
      requestId,
      user.id,
      reason.trim(),
    )
    if (request.kind === "HEALTH") return
    await this.mailer.sendChangeRequestStatus(request.email, {
      locale: request.locale,
      status: "REJECTED",
      participantName: request.participantName,
      eventName: request.eventName,
      reason: request.rejectionReason,
    })
  }
}
