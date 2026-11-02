import {
  ApplicationFilters,
  applicationList,
  ApplicationListEntry,
} from "@/modules/overview/domain/application-list"
import { ApplicationListRepository } from "@/modules/overview/repositories/application-list.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { Injectable } from "@nestjs/common"

@Injectable()
export class ApplicationListService {
  constructor(
    private readonly repository: ApplicationListRepository,
    private readonly access: OrganizationAccessService,
  ) {}
  async get(
    user: Identity,
    eventId: string,
    filters: ApplicationFilters,
  ): Promise<ApplicationListEntry[]> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return applicationList(await this.repository.find(eventId, organizationId), filters)
  }
}
