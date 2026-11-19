import { DEFAULT_LOCALE, Locale } from "@/core/email/locale"
import { PrismaService } from "@/core/prisma/prisma.service"
import { Injectable } from "@nestjs/common"

/** What the auth setup itself needs to read about a user (BetterAuth hooks run outside any module). */
@Injectable()
export class AuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The e-mail the account signs in with right now, or `null` for an unknown user. */
  async findEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    return user?.email ?? null
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
