import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import {
  NewParticipantAccount,
  ParticipantAccount,
} from "@/modules/participants/domain/participant-account"
import type { BetterAuth } from "@/shared/auth/providers/better-auth.provider"
import { Inject, Injectable } from "@nestjs/common"

/** The only place of the participants module that touches the database. */
@Injectable()
export class ParticipantAccountsRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("BetterAuth") private readonly auth: BetterAuth,
  ) {}

  async findByEmail(email: string): Promise<ParticipantAccount | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, accountType: true, mustSetPassword: true },
    })
    return user
  }

  /**
   * Creates the account the way BetterAuth's sign-up would (public sign-up is
   * off) — but without a credential account: the participant has no password
   * until the first sign-in by magic link (US-04).
   * Returns `null` when the e-mail was taken meanwhile (two applications at
   * once); the caller reads the winner.
   */
  async createParticipant(account: NewParticipantAccount): Promise<ParticipantAccount | null> {
    const context = await this.auth.$context
    try {
      const user = await context.internalAdapter.createUser(
        {
          email: account.email,
          name: account.name,
          emailVerified: true,
          accountType: "PARTICIPANT",
          mustSetPassword: true,
          locale: account.locale,
        },
        { method: "application" },
      )
      return { id: user.id, accountType: "PARTICIPANT", mustSetPassword: true }
    } catch (error) {
      if (this.isUniqueViolation(error)) return null
      throw error
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return true
    }
    // BetterAuth wraps adapter errors; look at the cause chain too.
    const cause = (error as { cause?: unknown } | null)?.cause
    return cause ? this.isUniqueViolation(cause) : false
  }
}
