import { PrismaService } from "@/core/prisma/prisma.service"
import {
  computeAmountDue,
  computeAmountPaid,
  computeRefundableAmount,
  resolvePaymentAmount,
} from "@/modules/applications/domain/pricing"
import { PaymentApplication } from "@/modules/payments/domain/payment"
import { AppException } from "@/shared/errors/app.exception"
import { ForbiddenException, HttpStatus, Injectable } from "@nestjs/common"

const include = {
  event: { select: { name: true } },
  terms: { include: { term: { select: { startsOn: true, endsOn: true } } } },
  payments: {
    where: { cancelledAt: null },
    include: { recordedBy: { select: { name: true } } },
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
  },
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(applicationId: string, organizationId: string): Promise<PaymentApplication | null> {
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId, organizationId },
      include,
    })
    return row
      ? {
          id: row.id,
          eventId: row.eventId,
          eventName: row.event.name,
          number: row.number,
          firstName: row.firstName,
          lastName: row.lastName,
          terms: row.terms.map(({ status, priceCzk, term }) => ({ status, priceCzk, ...term })),
          payments: row.payments.map(({ id, amountCzk, createdAt, recordedBy }) => ({
            id,
            amountCzk,
            createdAt,
            recordedByName: recordedBy.name,
          })),
        }
      : null
  }

  /** Each submission adds a receipt. Serialize balance resolution and make retries idempotent. */
  async record(
    applicationId: string,
    organizationId: string,
    recordedById: string,
    requestId: string,
    amountCzk: number | undefined,
    isRefund = false,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM application WHERE id = ${applicationId} AND "organizationId" = ${organizationId} FOR UPDATE`
      if (!rows.length) throw new ForbiddenException()
      const existing = await tx.payment.findUnique({ where: { id: requestId } })
      if (existing) {
        if (existing.organizationId !== organizationId || existing.applicationId !== applicationId)
          throw new ForbiddenException()
        if (
          existing.amountCzk < 0 !== isRefund ||
          (amountCzk !== undefined && existing.amountCzk !== (isRefund ? -amountCzk : amountCzk))
        )
          throw new AppException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_RECORDED")
        return
      }
      const application = await tx.application.findFirstOrThrow({
        where: { id: applicationId, organizationId },
        include: { terms: true, payments: { where: { cancelledAt: null } } },
      })
      const amount = resolvePaymentAmount(
        amountCzk,
        computeAmountDue(application.terms),
        computeAmountPaid(application.payments),
      )
      if (!Number.isInteger(amount) || amount < 1 || amount > 2147483647)
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      if (
        isRefund &&
        amount >
          computeRefundableAmount(
            computeAmountDue(application.terms),
            computeAmountPaid(application.payments),
          )
      )
        throw new AppException(HttpStatus.CONFLICT, "REFUND_EXCEEDS_OVERPAYMENT")
      await tx.payment.create({
        data: {
          id: requestId,
          applicationId,
          organizationId,
          amountCzk: isRefund ? -amount : amount,
          recordedById,
        },
      })
    })
  }

  async remove(applicationId: string, organizationId: string, paymentId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM application WHERE id = ${applicationId} AND "organizationId" = ${organizationId} FOR UPDATE`
      // Retain the submission ID and original amount so retries cannot restore a cancelled entry.
      const result = await tx.payment.updateMany({
        where: { id: paymentId, applicationId, organizationId, cancelledAt: null },
        data: { cancelledAt: new Date() },
      })
      if (!result.count) throw new ForbiddenException()
    })
  }
}
