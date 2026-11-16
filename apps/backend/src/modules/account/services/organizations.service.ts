import {
  isCzechBankAccount,
  OrganizationProfile,
  OrganizationProfileInput,
} from "@/modules/account/domain/organization"
import { OrganizationsRepository } from "@/modules/account/repositories/organizations.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly repository: OrganizationsRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  async create(user: Identity, name: string): Promise<OrganizationProfile> {
    if (!name.trim()) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    const organization = await this.repository.create(user.id, name.trim())
    if (!organization) {
      throw new AppException(HttpStatus.CONFLICT, "ORGANIZATION_ALREADY_EXISTS")
    }
    return organization
  }

  async get(user: Identity, organizationId: string): Promise<OrganizationProfile> {
    await this.access.assertCanAccessOrganization(user, organizationId)
    const organization = await this.repository.findById(organizationId)
    if (!organization) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return organization
  }

  async updateProfile(
    user: Identity,
    organizationId: string,
    input: OrganizationProfileInput,
  ): Promise<OrganizationProfile> {
    await this.access.assertCanAccessOrganization(user, organizationId)
    const contactEmail = input.contactEmail.trim().toLowerCase()
    const bankAccount = input.bankAccount.trim()
    if (!contactEmail || !isCzechBankAccount(bankAccount)) {
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    }
    return this.repository.updateProfile(organizationId, {
      contactEmail,
      contactPhone: input.contactPhone?.trim(),
      bankAccount,
    })
  }
}
