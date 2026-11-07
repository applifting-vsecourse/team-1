import {
  decideHealth,
  HealthInput,
  HealthRecord,
  healthWriteRoute,
} from "@/modules/health/domain/health"
import { HealthRepository } from "@/modules/health/repositories/health.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

/**
 * US-68: the health restriction of a participant. The account that submitted the application
 * writes it (with the explicit consent); only an organizer of the application's organization
 * reads it. Nothing else returns it.
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthRepository,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  /** Someone else's application and a missing one look the same: 403 with no content. */
  async getOwn(user: Identity, applicationId: string): Promise<HealthRecord> {
    const record = await this.health.findOfUser(user.id, applicationId)
    if (!record) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your application")
    return record
  }

  async saveOwn(user: Identity, applicationId: string, input: HealthInput): Promise<HealthRecord> {
    const organizationId = await this.health.findOrganizationId(user.id, applicationId)
    if (!organizationId) {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your application")
    }
    const stored = await this.health.findOfUser(user.id, applicationId)
    if (healthWriteRoute(stored?.note != null) === "request") {
      throw new AppException(
        HttpStatus.CONFLICT,
        "HEALTH_CHANGE_REQUEST_REQUIRED",
        "Filled-in health data changes only through a request to the organizer",
      )
    }
    const decision = decideHealth(input)
    if (decision.kind === "consent-required") {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        "HEALTH_CONSENT_REQUIRED",
        "The health restriction needs the explicit consent with its processing",
      )
    }
    if (decision.kind === "clear") await this.health.clear(applicationId)
    else await this.health.save(organizationId, applicationId, decision.note, new Date())
    return this.getOwn(user, applicationId)
  }

  async getForOrganizer(user: Identity, applicationId: string): Promise<HealthRecord> {
    const { organizationId } = await this.organizationAccess.assertCanAccessApplication(
      user,
      applicationId,
    )
    const record = await this.health.findOfOrganization(organizationId, applicationId)
    if (!record) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return record
  }
}
