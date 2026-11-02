import {
  computeCapacityDetails,
  computeEventCapacity,
  EventCapacityDetails,
  TermCapacity,
} from "@/modules/applications/domain/event-capacity"
import { CapacityRepository } from "@/modules/applications/repositories/capacity.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { Injectable } from "@nestjs/common"

@Injectable()
export class CapacityService {
  constructor(
    private readonly repository: CapacityRepository,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async getCapacity(user: Identity, eventId: string): Promise<TermCapacity[]> {
    const { organizationId } = await this.organizationAccess.assertCanAccessEvent(user, eventId)
    const snapshot = await this.repository.findSnapshot(eventId, organizationId)
    return computeEventCapacity(snapshot)
  }

  async getDetails(user: Identity, eventId: string): Promise<EventCapacityDetails> {
    const { organizationId } = await this.organizationAccess.assertCanAccessEvent(user, eventId)
    const snapshot = await this.repository.findDetails(eventId, organizationId)
    return computeCapacityDetails(snapshot)
  }
}
