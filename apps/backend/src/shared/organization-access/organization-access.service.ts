import { Identity } from "@/shared/auth/domain/identity"
import { ForbiddenException, Injectable } from "@nestjs/common"
import { OrganizationAccessRepository } from "./organization-access.repository"

/**
 * The one place that decides whether an organizer may touch an organization's
 * data (US-10). A record that doesn't exist and a record of another
 * organization both end in the same 403 with no body, so the response never
 * reveals whether a foreign id exists.
 */
@Injectable()
export class OrganizationAccessService {
  constructor(private readonly repository: OrganizationAccessRepository) {}

  /** Organizations the user may act for — filter list queries by these. */
  async getOrganizationIds(user: Identity): Promise<string[]> {
    if (user.accountType !== "ORGANIZER") return []
    return this.repository.findMemberOrganizationIds(user.id)
  }

  async assertCanAccessOrganization(user: Identity, organizationId: string): Promise<void> {
    const isMember =
      user.accountType === "ORGANIZER" && (await this.repository.isMember(user.id, organizationId))
    if (!isMember) throw new ForbiddenException()
  }

  /** @returns the event's organization, for scoping further queries. */
  async assertCanAccessEvent(user: Identity, eventId: string): Promise<{ organizationId: string }> {
    const organizationId = await this.repository.findEventOrganizationId(eventId)
    if (!organizationId) throw new ForbiddenException()
    await this.assertCanAccessOrganization(user, organizationId)
    return { organizationId }
  }

  /** @returns the application's organization, for scoping further queries. */
  async assertCanAccessApplication(
    user: Identity,
    applicationId: string,
  ): Promise<{ organizationId: string }> {
    const organizationId = await this.repository.findApplicationOrganizationId(applicationId)
    if (!organizationId) throw new ForbiddenException()
    await this.assertCanAccessOrganization(user, organizationId)
    return { organizationId }
  }
}
