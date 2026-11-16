import {
  buildApplicationHistory,
  HistoryEntry,
} from "@/modules/applications/domain/application-history"
import { ApplicationHistoryRepository } from "@/modules/applications/repositories/application-history.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class ApplicationHistoryService {
  constructor(
    private readonly repository: ApplicationHistoryRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  async get(user: Identity, applicationId: string): Promise<HistoryEntry[]> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const source = await this.repository.find(applicationId, organizationId)
    if (!source) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return buildApplicationHistory(source)
  }
}
