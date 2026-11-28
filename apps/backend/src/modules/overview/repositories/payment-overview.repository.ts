import { PrismaService } from "@/core/prisma/prisma.service"
import {
  OutstandingOverpaymentTerm,
  PaymentOverviewTerm,
} from "@/modules/overview/domain/payment-overview"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class PaymentOverviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOverpaymentCandidates(
    eventId: string,
    organizationId: string,
  ): Promise<OutstandingOverpaymentTerm[]> {
    const rows = await this.prisma.applicationTerm.findMany({
      where: {
        organizationId,
        application: { eventId, organizationId },
        payments: { some: { cancelledAt: null, amountCzk: { gt: 0 } } },
      },
      select: {
        application: { select: { id: true, number: true, firstName: true, lastName: true } },
        term: { select: { id: true, number: true, name: true, startsOn: true, endsOn: true } },
        status: true,
        priceCzk: true,
        payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
      },
      orderBy: [{ term: { startsOn: "asc" } }, { application: { number: "asc" } }],
    })
    return rows.map(({ application, term, status, priceCzk, payments }) => ({
      applicationId: application.id,
      applicationNumber: application.number,
      firstName: application.firstName,
      lastName: application.lastName,
      termId: term.id,
      termNumber: term.number,
      termName: term.name,
      startsOn: term.startsOn,
      endsOn: term.endsOn,
      status,
      priceCzk,
      payments,
    }))
  }

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
          application: { select: { id: true, number: true, firstName: true, lastName: true } },
          term: { select: { id: true, number: true, name: true, startsOn: true, endsOn: true } },
          priceCzk: true,
          evaluatedAt: true,
          paymentPeriodStartedAt: true,
          paymentReminderSentAt: true,
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
        applicationNumber: row.application.number,
        termNumber: row.term.number,
        firstName: row.application.firstName,
        lastName: row.application.lastName,
        termId: row.term.id,
        termName: row.term.name,
        startsOn: row.term.startsOn,
        endsOn: row.term.endsOn,
        priceCzk: row.priceCzk,
        evaluatedAt: row.evaluatedAt,
        confirmedAt: row.statusChanges[0]?.createdAt ?? null,
        paymentPeriodStartedAt: row.paymentPeriodStartedAt,
        paymentReminderSentAt: row.paymentReminderSentAt,
        payments: row.payments,
      })),
    }
  }
}
