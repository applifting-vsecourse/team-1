import { computeEventOccupancy, EventOccupancy } from "@/modules/overview/domain/occupancy"
import { OccupancyRepository } from "@/modules/overview/repositories/occupancy.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { Injectable } from "@nestjs/common"

@Injectable()
export class OccupancyService {
  constructor(
    private readonly repository: OccupancyRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  async get(user: Identity, eventId: string): Promise<EventOccupancy> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return computeEventOccupancy(await this.repository.findSource(eventId, organizationId))
  }
}
