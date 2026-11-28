import { CostCategory } from "@/modules/economics/domain/cost-category"
import { CostCategoriesRepository } from "@/modules/economics/repositories/cost-categories.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { Injectable } from "@nestjs/common"

@Injectable()
export class CostCategoriesService {
  constructor(
    private readonly repository: CostCategoriesRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  /** Categories belong to the organization, so all its events share them. */
  async listForEvent(user: Identity, eventId: string): Promise<CostCategory[]> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return this.repository.findByOrganization(organizationId)
  }
}
