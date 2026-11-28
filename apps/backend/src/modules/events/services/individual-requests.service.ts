import { IndividualRequest } from "@/modules/events/domain/individual-request"
import { IndividualRequestsRepository } from "@/modules/events/repositories/individual-requests.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { Injectable } from "@nestjs/common"

@Injectable()
export class IndividualRequestsService {
  constructor(
    private readonly repository: IndividualRequestsRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  async list(user: Identity, eventId: string, termId: string): Promise<IndividualRequest[]> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return this.repository.find({ eventId, termId, organizationId })
  }
}
