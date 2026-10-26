import { OrganizerEvent, toOrganizerEvent } from "@/modules/events/domain/organizer-event"
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
