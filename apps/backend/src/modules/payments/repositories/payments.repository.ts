import { PrismaService } from "@/core/prisma/prisma.service"
import { computeAmountDue, resolvePaymentAmount } from "@/modules/applications/domain/pricing"
import { PaymentApplication } from "@/modules/payments/domain/payment"
import { AppException } from "@/shared/errors/app.exception"
import { ForbiddenException, HttpStatus, Injectable } from "@nestjs/common"

const include = {
  event: { select: { name: true } },
  terms: { include: { term: { select: { startsOn: true, endsOn: true } } } },
  payments: {
    include: { recordedBy: { select: { name: true } } },
    orderBy: { createdAt: "asc" as const },
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

  /** Serialize writes on the application, including amount resolution and duplicate checks. */
  async save(
    applicationId: string,
    organizationId: string,
    recordedById: string,
    amountCzk: number | undefined,
    paymentId?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM application WHERE id = ${applicationId} AND "organizationId" = ${organizationId} FOR UPDATE`
      if (!rows.length) throw new ForbiddenException()
      const application = await tx.application.findFirstOrThrow({
        where: { id: applicationId, organizationId },
        include: { terms: true, payments: true },
      })
      const amount = resolvePaymentAmount(amountCzk, computeAmountDue(application.terms))
      if (amount > 2147483647) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      if (paymentId) {
        const result = await tx.payment.updateMany({
          where: { id: paymentId, applicationId, organizationId },
          data: { amountCzk: amount, recordedById },
        })
        if (!result.count) throw new ForbiddenException()
      } else {
        if (application.payments.length)
          throw new AppException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_RECORDED")
        await tx.payment.create({
          data: { applicationId, organizationId, amountCzk: amount, recordedById },
        })
      }
    })
  }

  async remove(applicationId: string, organizationId: string, paymentId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM application WHERE id = ${applicationId} AND "organizationId" = ${organizationId} FOR UPDATE`
      const result = await tx.payment.deleteMany({
        where: { id: paymentId, applicationId, organizationId },
      })
      if (!result.count) throw new ForbiddenException()
    })
  }
}
