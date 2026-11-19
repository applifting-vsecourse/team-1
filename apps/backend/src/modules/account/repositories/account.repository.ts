import { DEFAULT_LOCALE, Locale } from "@/core/email/locale"
import { PrismaService } from "@/core/prisma/prisma.service"
import { OrganizationSummary, ProfileChange, SavedProfile } from "@/modules/account/domain/account"
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

  async updateProfile(userId: string, change: ProfileChange): Promise<SavedProfile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: change.name, locale: change.locale }, // undefined = unchanged
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

  /**
   * Language of the e-mails to the account itself (reset password, verification, e-mail change):
   * the preferred language, else the language of the first application, else English.
   */
  async findEmailLocale(userId: string): Promise<Locale> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        locale: true,
        applications: { orderBy: { submittedAt: "asc" }, take: 1, select: { locale: true } },
      },
    })
    return user?.locale ?? user?.applications[0]?.locale ?? DEFAULT_LOCALE
  }
}
