import { PrismaService } from "@/core/prisma/prisma.service"
import { PaymentOverviewTerm } from "@/modules/overview/domain/payment-overview"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class PaymentOverviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    eventId: string,
    organizationId: string,
  ): Promise<{ paymentPeriodDays: number; terms: PaymentOverviewTerm[] }> {
    const [event, rows] = await Promise.all([
      this.prisma.event.findFirst({
        where: { id: eventId, organizationId },
        select: { paymentPeriodDays: true },
      }),
      this.prisma.applicationTerm.findMany({
        where: { organizationId, status: "CONFIRMED", application: { eventId } },
        select: {
          application: { select: { id: true, firstName: true, lastName: true } },
          term: { select: { id: true, name: true, startsOn: true } },
          priceCzk: true,
          evaluatedAt: true,
          paymentPeriodStartedAt: true,
          payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
          statusChanges: {
            where: { toStatus: "CONFIRMED" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
    ])
    if (!event) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return {
      paymentPeriodDays: event.paymentPeriodDays,
      terms: rows.map((row) => ({
        applicationId: row.application.id,
        firstName: row.application.firstName,
        lastName: row.application.lastName,
        termId: row.term.id,
        termName: row.term.name,
        startsOn: row.term.startsOn,
        priceCzk: row.priceCzk,
        evaluatedAt: row.evaluatedAt,
        confirmedAt: row.statusChanges[0]?.createdAt ?? null,
        paymentPeriodStartedAt: row.paymentPeriodStartedAt,
        // US-46 has not introduced persisted reminder delivery yet. None have been sent.
        paymentReminderSentAt: null,
        payments: row.payments,
      })),
    }
  }
}
