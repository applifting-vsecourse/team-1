import { EvaluationMode } from "@/modules/applications/domain/evaluation-mode"
import { isValidCancellationStart } from "@/modules/events/domain/cancellation-start"
import { normalizeCancellationTerms } from "@/modules/events/domain/cancellation-terms"
import { OrganizerEvent, toOrganizerEvent } from "@/modules/events/domain/organizer-event"
import {
  cleanFileName,
  detectPhotoType,
  missingForCatalog,
  photoProblem,
  PublicPageInput,
} from "@/modules/events/domain/public-page"
import { EventsRepository } from "@/modules/events/repositories/events.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { generateToken } from "@/shared/utils/token"
import { HttpStatus, Injectable } from "@nestjs/common"

export type CreateEventInput = {
  /** Which of the organizer's organizations; may be left out when there is only one. */
  organizationId?: string
  name: string
  description?: string
  location?: string
}

const blankToNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

@Injectable()
export class EventsService {
  constructor(
    private readonly repository: EventsRepository,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async create(user: Identity, input: CreateEventInput): Promise<OrganizerEvent> {
    const name = input.name.trim()
    if (!name) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")

    const organizationId = await this.resolveOrganizationId(user, input.organizationId)
    if (!(await this.repository.hasBankAccount(organizationId))) {
      throw new AppException(HttpStatus.FORBIDDEN, "ORGANIZATION_PROFILE_INCOMPLETE")
    }
    const event = await this.repository.create({
      organizationId,
      name,
      description: blankToNull(input.description),
      location: blankToNull(input.location),
      publicToken: generateToken(),
    })
    return toOrganizerEvent(event)
  }

  async list(user: Identity): Promise<OrganizerEvent[]> {
    const organizationIds = await this.organizationAccess.getOrganizationIds(user)
    const events = await this.repository.findByOrganizations(organizationIds)
    return events.map(toOrganizerEvent)
  }

  async get(user: Identity, eventId: string): Promise<OrganizerEvent> {
    await this.organizationAccess.assertCanAccessEvent(user, eventId)
    const event = await this.repository.findById(eventId)
    if (!event) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return toOrganizerEvent(event)
  }

  /** Before the application link opens only; afterwards 409 (US-101). */
  async setEvaluationMode(
    user: Identity,
    eventId: string,
    mode: EvaluationMode,
  ): Promise<OrganizerEvent> {
    const { organizationId } = await this.organizationAccess.assertCanAccessEvent(user, eventId)
    await this.repository.setEvaluationMode(eventId, organizationId, mode)
    return this.get(user, eventId)
  }

  async setCancellationStart(
    user: Identity,
    eventId: string,
    cancellationStartsOn: string | null,
  ): Promise<OrganizerEvent> {
    if (cancellationStartsOn !== null && !isValidCancellationStart(cancellationStartsOn)) {
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    }
    const { organizationId } = await this.organizationAccess.assertCanAccessEvent(user, eventId)
    await this.repository.setCancellationStart(eventId, organizationId, cancellationStartsOn)
    return this.get(user, eventId)
  }

  async setCancellationTerms(
    user: Identity,
    eventId: string,
    cancellationTerms: string,
  ): Promise<OrganizerEvent> {
    const text = normalizeCancellationTerms(cancellationTerms)
    if (text === null) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    const { organizationId } = await this.organizationAccess.assertCanAccessEvent(user, eventId)
    await this.repository.setCancellationTerms(eventId, organizationId, text)
    return this.get(user, eventId)
  }

  /**
   * Saves the content of the public page (US-122). The event may go to the catalog only with a
   * description, a place and a contact e-mail; turning it off needs nothing.
   */
  async updatePublicPage(
    user: Identity,
    eventId: string,
    input: Omit<PublicPageInput, "name"> & { name: string },
  ): Promise<OrganizerEvent> {
    const { organizationId } = await this.organizationAccess.assertCanAccessEvent(user, eventId)
    const page: PublicPageInput = {
      name: input.name.trim(),
      description: blankToNull(input.description ?? undefined),
      location: blankToNull(input.location ?? undefined),
      contactEmail: blankToNull(input.contactEmail ?? undefined),
      contactPhone: blankToNull(input.contactPhone ?? undefined),
      publishedInCatalog: input.publishedInCatalog,
    }
    if (!page.name) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    if (page.publishedInCatalog && missingForCatalog(page).length > 0)
      throw new AppException(HttpStatus.BAD_REQUEST, "PUBLIC_PAGE_INCOMPLETE")
    await this.repository.updatePublicPage(eventId, organizationId, page)
    return this.get(user, eventId)
  }

  /** Stores the one photo of the public page; the bytes decide the type, not the client. */
  async savePhoto(
    user: Identity,
    eventId: string,
    data: unknown,
    fileName: string | undefined,
  ): Promise<OrganizerEvent> {
    await this.organizationAccess.assertCanAccessEvent(user, eventId)
    const bytes = Buffer.isBuffer(data) ? data : Buffer.alloc(0)
    const problem = photoProblem(bytes)
    if (problem === "TOO_LARGE")
      throw new AppException(HttpStatus.PAYLOAD_TOO_LARGE, "PHOTO_TOO_LARGE")
    const contentType = detectPhotoType(bytes)
    if (problem || !contentType)
      throw new AppException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "PHOTO_INVALID_TYPE")
    await this.repository.savePhoto(eventId, {
      fileName: cleanFileName(fileName, contentType),
      contentType,
      data: bytes,
    })
    return this.get(user, eventId)
  }

  /** Removes the photo of the public page; an event without one stays as it is. */
  async deletePhoto(user: Identity, eventId: string): Promise<OrganizerEvent> {
    await this.organizationAccess.assertCanAccessEvent(user, eventId)
    await this.repository.deletePhoto(eventId)
    return this.get(user, eventId)
  }

  async getPhoto(
    user: Identity,
    eventId: string,
  ): Promise<{ contentType: string; data: Uint8Array }> {
    await this.organizationAccess.assertCanAccessEvent(user, eventId)
    const photo = await this.repository.findPhoto(eventId)
    if (!photo) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return photo
  }

  /** Only an event nobody has applied to can be deleted (issue #153); otherwise 409. */
  async delete(user: Identity, eventId: string): Promise<void> {
    await this.organizationAccess.assertCanAccessEvent(user, eventId)
    if (await this.repository.deleteWithoutApplications(eventId)) return
    if (!(await this.repository.findById(eventId)))
      throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    throw new AppException(HttpStatus.CONFLICT, "EVENT_HAS_APPLICATIONS")
  }

  private async resolveOrganizationId(user: Identity, requested?: string): Promise<string> {
    if (requested) {
      await this.organizationAccess.assertCanAccessOrganization(user, requested)
      return requested
    }
    const organizationIds = await this.organizationAccess.getOrganizationIds(user)
    if (organizationIds.length !== 1) {
      // No membership is a 403, several without a choice is a bad request.
      if (organizationIds.length === 0) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    }
    return organizationIds[0]
  }
}
