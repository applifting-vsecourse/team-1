import { PrismaService } from "@/core/prisma/prisma.service"
import {
  OrganizationProfile,
  OrganizationProfileInput,
} from "@/modules/account/domain/organization"
import { Injectable } from "@nestjs/common"

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string): Promise<OrganizationProfile | null> {
    const organization = await this.prisma.$transaction(async (tx) => {
      // Serialize requests for the same organizer so two submits cannot create two organizations.
      await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`
      const membership = await tx.organizationMember.findFirst({ where: { userId } })
      if (membership) return null
      return tx.organization.create({
        data: { name, bankAccount: "", members: { create: { userId } } },
      })
    })
    return organization
  }

  async findMemberOrganization(userId: string): Promise<OrganizationProfile | null> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    })
    return membership?.organization ?? null
  }

  async findById(id: string): Promise<OrganizationProfile | null> {
    return this.prisma.organization.findUnique({ where: { id } })
  }

  async updateProfile(
    organizationId: string,
    input: OrganizationProfileInput,
  ): Promise<OrganizationProfile> {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone || null,
        bankAccount: input.bankAccount,
      },
    })
  }
}
