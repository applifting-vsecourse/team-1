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
    if (decision.kind === "invalid") {
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Invalid health input")
    }
    if (decision.kind === "consent-required") {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        "HEALTH_CONSENT_REQUIRED",
        "The health restriction needs the explicit consent with its processing",
      )
    }
    if (decision.kind === "clear") {
      await this.health.clear(applicationId)
    } else if (decision.kind === "none") await this.health.confirmNoRestriction(applicationId)
    else await this.health.save(organizationId, applicationId, decision.note, new Date())
    return this.getOwn(user, applicationId)
  }

  /**
   * An organizer writes the restriction for a participant who does not use the application
   * (D-191, #789): only the first time, and only after confirming that the applicant gave the
   * explicit consent. Changing or deleting a stored note stays with the change request (D-122).
   */
  async saveByOrganizer(
    user: Identity,
    applicationId: string,
    input: { note: string; noRestriction?: boolean; consentConfirmed: boolean },
  ): Promise<HealthRecord> {
    const { organizationId } = await this.organizationAccess.assertCanAccessApplication(
      user,
      applicationId,
    )
    if (!input.consentConfirmed) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        "HEALTH_ORGANIZER_CONSENT_REQUIRED",
        "The organizer has to confirm the applicant's explicit consent",
      )
    }
    const stored = await this.health.findOfOrganization(organizationId, applicationId)
    if (!stored) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    if (healthWriteRoute(stored.note != null) === "request") {
      throw new AppException(HttpStatus.CONFLICT, "HEALTH_CHANGE_REQUEST_REQUIRED")
    }
    // The organizer has the consent confirmed, so the participant's rule runs with `consent`.
    const decision = decideHealth({ ...input, consent: true })
    if (decision.kind === "invalid" || decision.kind === "clear") {
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Invalid health input")
    }
    const editor = { id: user.id, name: user.name?.trim() || user.email }
    if (decision.kind === "none") {
      await this.health.confirmNoRestriction(applicationId, { organizationId, editor })
    } else if (decision.kind === "save") {
      await this.health.save(organizationId, applicationId, decision.note, new Date(), editor)
    }
    return this.getForOrganizer(user, applicationId)
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
