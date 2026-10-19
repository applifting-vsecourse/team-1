import { PrismaService } from "@/core/prisma/prisma.service"
import { OrganizationSummary } from "@/modules/account/domain/account"
import { Injectable } from "@nestjs/common"

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrganizationsOfMember(userId: string): Promise<OrganizationSummary[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: { select: { id: true, name: true } } },
      orderBy: { organization: { name: "asc" } },
    })
    return memberships.map(({ organization }) => ({
      id: organization.id,
      name: organization.name,
    }))
  }
}
