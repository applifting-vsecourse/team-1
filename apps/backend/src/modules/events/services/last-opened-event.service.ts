import { LastOpenedEventRepository } from "@/modules/events/repositories/last-opened-event.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { Injectable } from "@nestjs/common"

/** The event the organizer opened last, kept on the server so it follows them across devices (US-51). */
@Injectable()
export class LastOpenedEventService {
  constructor(
    private readonly repository: LastOpenedEventRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  async remember(user: Identity, eventId: string): Promise<void> {
    await this.access.assertCanAccessEvent(user, eventId)
    await this.repository.save(user.id, eventId)
  }

  /** Null without one, or when the event is gone or no longer the organizer's. */
  async get(user: Identity): Promise<string | null> {
    const organizationIds = await this.access.getOrganizationIds(user)
    return this.repository.findAccessibleEventId(user.id, organizationIds)
  }
}
