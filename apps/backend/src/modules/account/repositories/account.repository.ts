import { PrismaService } from "@/core/prisma/prisma.service"
import { OrganizationSummary, ProfileChange } from "@/modules/account/domain/account"
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

  async updateProfile(userId: string, change: ProfileChange): Promise<ProfileChange> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: change.name, locale: change.locale },
      select: { name: true, locale: true },
    })
    return { name: user.name, locale: user.locale }
  }

  /** Whether any account (of any type) already signs in with this e-mail. */
  async isEmailTaken(email: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    })
    return user !== null
  }
}
