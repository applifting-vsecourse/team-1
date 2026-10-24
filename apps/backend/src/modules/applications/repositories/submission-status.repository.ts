import { PrismaService } from "@/core/prisma/prisma.service"
import { SubmissionRecord } from "@/modules/applications/domain/submission-status"
import { Injectable } from "@nestjs/common"

/** Reads the applications of one submission for the confirmation page (US-25). */
@Injectable()
export class SubmissionStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The whole submission an application belongs to: the applications one form
   * submit stored — same event, e-mail and consent moment — in form order.
   * `null` for an unknown token; the token is the only credential.
   */
  async findByAccessToken(accessToken: string): Promise<SubmissionRecord | null> {
    const first = await this.prisma.application.findUnique({
      where: { accessToken },
      select: {
        eventId: true,
        email: true,
        consentAt: true,
        event: { select: { name: true } },
        organization: { select: { bankAccount: true } },
        user: { select: { mustSetPassword: true } },
      },
    })
    if (!first) return null

    const rows = await this.prisma.application.findMany({
      where: { eventId: first.eventId, email: first.email, consentAt: first.consentAt },
      include: {
        terms: { include: { term: true } },
        payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
      },
      orderBy: { number: "asc" },
    })

    return {
      eventName: first.event.name,
      bankAccount: first.organization.bankAccount,
      email: first.email,
      mustSetPassword: first.user?.mustSetPassword ?? false,
      applications: rows.map((row) => ({
        number: row.number,
        firstName: row.firstName,
        lastName: row.lastName,
        terms: row.terms.map(({ term, status, priceCzk }) => ({
          termId: term.id,
          name: term.name,
          startsOn: term.startsOn,
          endsOn: term.endsOn,
          status,
          priceCzk,
        })),
        payments: row.payments,
      })),
    }
  }
}
