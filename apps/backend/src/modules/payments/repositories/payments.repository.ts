import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import {
  allocatePayment,
  computeRefundableAmount,
  computeTermDue,
  computeTermOwed,
  computeTermPaid,
  resolvePaymentAmount,
} from "@/modules/applications/domain/pricing"
import { PaymentApplication } from "@/modules/payments/domain/payment"
import { AppException } from "@/shared/errors/app.exception"
import { ForbiddenException, HttpStatus, Injectable } from "@nestjs/common"

const include = {
  event: { select: { name: true } },
  organization: { select: { bankAccount: true } },
  terms: {
    include: {
      term: { select: { id: true, number: true, startsOn: true, endsOn: true } },
      payments: {
        where: { cancelledAt: null },
        include: { recordedBy: { select: { name: true } } },
      },
    },
  },
} satisfies Prisma.ApplicationInclude

type Row = Prisma.ApplicationGetPayload<{ include: typeof include }>

const toDomain = (row: Row): PaymentApplication => ({
  id: row.id,
  eventId: row.eventId,
  eventName: row.event.name,
  bankAccount: row.organization.bankAccount,
  number: row.number,
  firstName: row.firstName,
  lastName: row.lastName,
  terms: row.terms.map((applicationTerm) => ({
    applicationTermId: applicationTerm.id,
    termId: applicationTerm.term.id,
    termNumber: applicationTerm.term.number,
    status: applicationTerm.status,
    priceCzk: applicationTerm.priceCzk,
    startsOn: applicationTerm.term.startsOn,
    endsOn: applicationTerm.term.endsOn,
    payments: applicationTerm.payments.map(
      ({ id, receiptId, amountCzk, createdAt, recordedBy }) => ({
        id,
        receiptId,
        amountCzk,
        createdAt,
        recordedByName: recordedBy.name,
      }),
    ),
  })),
})

export type RecordPaymentInput = {
  applicationId: string
  organizationId: string
  recordedById: string
  /** Idempotency key and `receiptId` of the rows. */
  requestId: string
  /** Omitted = the whole application (summary payment), given = one term. */
  termId?: string
  /** Omitted = settle the remaining debt of the term (or of the summary). */
  amountCzk?: number
  isRefund?: boolean
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(applicationId: string, organizationId: string): Promise<PaymentApplication | null> {
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId, organizationId },
      include,
    })
    return row ? toDomain(row) : null
  }

  /**
   * Each submission is one receipt of one or more rows. Balance resolution is serialized by a
   * lock on the application and retries of the same `requestId` add nothing.
   */
  async record(input: RecordPaymentInput): Promise<void> {
    const {
      applicationId,
      organizationId,
      recordedById,
      requestId,
      termId,
      isRefund = false,
    } = input
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM application WHERE id = ${applicationId} AND "organizationId" = ${organizationId} FOR UPDATE`
      if (!locked.length) throw new ForbiddenException()

      const existing = await tx.payment.findMany({
        where: { receiptId: requestId },
        include: { applicationTerm: { select: { applicationId: true, termId: true } } },
      })
      if (existing.length) {
        if (
          existing.some(
            (row) =>
              row.organizationId !== organizationId ||
              row.applicationTerm.applicationId !== applicationId,
          )
        )
          throw new ForbiddenException()
        const total = existing.reduce((sum, row) => sum + row.amountCzk, 0)
        const sameTerm =
          termId === undefined || existing.every((row) => row.applicationTerm.termId === termId)
        if (
          existing.some((row) => row.amountCzk < 0) !== isRefund ||
          !sameTerm ||
          (input.amountCzk !== undefined &&
            total !== (isRefund ? -input.amountCzk : input.amountCzk))
        )
          throw new AppException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_RECORDED")
        return
      }

      if (isRefund && termId === undefined)
        throw new AppException(HttpStatus.BAD_REQUEST, "REFUND_TERM_REQUIRED")

      const application = await tx.application.findFirstOrThrow({
        where: { id: applicationId, organizationId },
        include: {
          terms: {
            include: {
              term: { select: { number: true, startsOn: true } },
              payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
            },
          },
        },
      })
      const terms = application.terms.map((applicationTerm) => ({
        applicationTermId: applicationTerm.id,
        termId: applicationTerm.termId,
        status: applicationTerm.status,
        startsOn: applicationTerm.term.startsOn,
        termNumber: applicationTerm.term.number,
        due: computeTermDue(applicationTerm),
        paid: computeTermPaid(applicationTerm.payments),
        owedCzk: computeTermOwed(applicationTerm, applicationTerm.payments),
      }))

      let rows: { applicationTermId: string; amountCzk: number }[]
      if (termId !== undefined) {
        const term = terms.find((candidate) => candidate.termId === termId)
        if (!term) throw new AppException(HttpStatus.BAD_REQUEST, "PAYMENT_TERM_NOT_IN_APPLICATION")
        const amount = resolvePaymentAmount(input.amountCzk, term.due, term.paid)
        assertAmount(amount)
        if (isRefund && amount > computeRefundableAmount(term.due, term.paid))
          throw new AppException(HttpStatus.CONFLICT, "REFUND_EXCEEDS_OVERPAYMENT")
        rows = [
          { applicationTermId: term.applicationTermId, amountCzk: isRefund ? -amount : amount },
        ]
      } else {
        const payable = terms.reduce((sum, term) => sum + Math.max(0, term.owedCzk), 0)
        const amount = resolvePaymentAmount(input.amountCzk, payable)
        assertAmount(amount)
        rows = allocatePayment(amount, terms)
      }

      await tx.payment.createMany({
        data: rows.map((row) => ({
          organizationId,
          applicationTermId: row.applicationTermId,
          receiptId: requestId,
          amountCzk: row.amountCzk,
          recordedById,
        })),
      })
    })
  }

  /** Cancels the whole receipt the row belongs to; the rows stay so a retry cannot restore it. */
  async remove(applicationId: string, organizationId: string, receiptId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM application WHERE id = ${applicationId} AND "organizationId" = ${organizationId} FOR UPDATE`
      const result = await tx.payment.updateMany({
        where: {
          receiptId,
          organizationId,
          cancelledAt: null,
          applicationTerm: { applicationId },
        },
        data: { cancelledAt: new Date() },
      })
      if (!result.count) throw new ForbiddenException()
    })
  }
}

function assertAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount < 1 || amount > 2147483647)
    throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
}
