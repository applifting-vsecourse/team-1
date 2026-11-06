import { Locale } from "@/core/email/locale"
import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computePaymentDeadline } from "@/modules/applications/domain/payment-deadline"
import { planPaymentDebtRenewal } from "@/modules/applications/domain/payment-debt-renewal"
import {
  allocatePayment,
  computePayableAmount,
  computeRefundableAmount,
  computeTermDue,
  computeTermOwed,
  computeTermPaid,
  resolvePaymentAmount,
} from "@/modules/applications/domain/pricing"
import { NotificationsRepository } from "@/modules/notifications/repositories/notifications.repository"
import { resolveChangeEmailLocale } from "@/modules/participants/domain/change-email-locale"
import { PaymentApplication } from "@/modules/payments/domain/payment"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

const include = {
  event: { select: { name: true, paymentPeriodDays: true } },
  organization: { select: { bankAccount: true } },
  terms: {
    include: {
      term: { select: { id: true, number: true, name: true, startsOn: true, endsOn: true } },
      payments: {
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
  paymentPeriodDays: row.event.paymentPeriodDays,
  bankAccount: row.organization.bankAccount,
  number: row.number,
  firstName: row.firstName,
  lastName: row.lastName,
  birthDate: row.birthDate,
  gender: row.gender,
  email: row.email,
  terms: row.terms.map((applicationTerm) => ({
    applicationTermId: applicationTerm.id,
    termId: applicationTerm.term.id,
    termNumber: applicationTerm.term.number,
    termName: applicationTerm.term.name,
    status: applicationTerm.status,
    priceCzk: applicationTerm.priceCzk,
    startsOn: applicationTerm.term.startsOn,
    endsOn: applicationTerm.term.endsOn,
    paymentPeriodStartedAt: applicationTerm.paymentPeriodStartedAt,
    payments: applicationTerm.payments.map(
      ({
        id,
        receiptId,
        correctsReceiptId,
        isSummary,
        cancelledAt,
        amountCzk,
        createdAt,
        recordedBy,
      }) => ({
        id,
        receiptId,
        correctsReceiptId,
        isSummary,
        cancelledAt,
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
  correctsReceiptId?: string
}

export type PaymentDebtNotice = {
  amountOwedCzk: number
  terms: { termNumber: number; amountOwedCzk: number; paymentDueAt: Date | null }[]
}

@Injectable()
export class PaymentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsRepository,
  ) {}

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
    const { applicationId, organizationId, requestId, termId, isRefund = false } = input
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM application WHERE id = ${applicationId} AND "organizationId" = ${organizationId} FOR UPDATE`
      if (!locked.length) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")

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
          throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
        const total = existing.reduce((sum, row) => sum + row.amountCzk, 0)
        const sameTerm = existing.every(
          (row) =>
            row.isSummary === (termId === undefined) &&
            (termId === undefined || row.applicationTerm.termId === termId),
        )
        if (
          total < 0 !== isRefund ||
          existing.some((row) => row.correctsReceiptId !== null) ||
          !sameTerm ||
          (input.amountCzk !== undefined &&
            total !== (isRefund ? -input.amountCzk : input.amountCzk))
        )
          throw new AppException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_RECORDED")
        return
      }

      await this.createReceipt(tx, input)
    })
  }

  /** A correction cancels and replaces a whole receipt under the same application lock. */
  async correct(
    input: RecordPaymentInput & { receiptId: string },
  ): Promise<PaymentDebtNotice | null> {
    const { applicationId, organizationId, receiptId, requestId } = input
    if (receiptId === requestId)
      throw new AppException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_RECORDED")
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM application WHERE id = ${applicationId} AND "organizationId" = ${organizationId} FOR UPDATE`
      if (!locked.length) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")

      const original = await tx.payment.findMany({
        where: { receiptId, organizationId, applicationTerm: { applicationId } },
      })
      if (!original.length) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      const originalTotal = original.reduce((sum, row) => sum + row.amountCzk, 0)
      if (originalTotal < 0 !== (input.isRefund ?? false))
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")

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
          throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
        if (
          existing.some(
            (row) =>
              row.correctsReceiptId !== receiptId ||
              row.isSummary !== (input.termId === undefined) ||
              (input.termId !== undefined && row.applicationTerm.termId !== input.termId),
          ) ||
          existing.reduce((sum, row) => sum + row.amountCzk, 0) !==
            (input.isRefund ? -input.amountCzk! : input.amountCzk)
        )
          throw new AppException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_RECORDED")
        return null
      }
      if (original.some((row) => row.cancelledAt !== null))
        throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      const paidBefore = await this.confirmedTermBalances(tx, applicationId)
      await tx.payment.updateMany({
        where: { receiptId, organizationId, applicationTerm: { applicationId } },
        data: { cancelledAt: new Date() },
      })
      await this.createReceipt(tx, { ...input, correctsReceiptId: receiptId })
      return this.createdDebt(tx, applicationId, paidBefore)
    })
  }

  private async confirmedTermBalances(
    tx: Prisma.TransactionClient,
    applicationId: string,
  ): Promise<
    {
      id: string
      termNumber: number
      owedCzk: number
      paymentPeriodStartedAt: Date | null
      paymentPeriodDays: number
    }[]
  > {
    const terms = await tx.applicationTerm.findMany({
      where: { applicationId, status: "CONFIRMED" },
      include: {
        term: { select: { number: true } },
        application: { select: { event: { select: { paymentPeriodDays: true } } } },
        payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
      },
    })
    return terms.map((term) => ({
      id: term.id,
      termNumber: term.term.number,
      owedCzk: computeTermOwed(term, term.payments),
      paymentPeriodStartedAt: term.paymentPeriodStartedAt,
      paymentPeriodDays: term.application.event.paymentPeriodDays,
    }))
  }

  private async createdDebt(
    tx: Prisma.TransactionClient,
    applicationId: string,
    before: { id: string; owedCzk: number }[],
  ): Promise<PaymentDebtNotice | null> {
    const after = await this.confirmedTermBalances(tx, applicationId)
    const renewal = planPaymentDebtRenewal(before, after)
    if (renewal === null) return null
    const restartedAt = new Date()
    await tx.applicationTerm.updateMany({
      where: { id: { in: renewal.renewedTermIds } },
      data: { paymentPeriodStartedAt: restartedAt },
    })
    const terms = renewal.indebtedTerms.map((term) => ({
      termNumber: term.termNumber,
      amountOwedCzk: term.owedCzk,
      paymentDueAt: computePaymentDeadline({
        ...term,
        paymentPeriodStartedAt: renewal.renewedTermIds.includes(term.id)
          ? restartedAt
          : term.paymentPeriodStartedAt,
      }),
    }))
    return { amountOwedCzk: computePayableAmount(terms.map((term) => term.amountOwedCzk)), terms }
  }

  async findEmailContext(
    applicationId: string,
    organizationId: string,
  ): Promise<{
    email: string
    locale: Locale
    eventName: string
    organizationName: string
    number: number
    bankAccount: string
    accessToken: string
    firstName: string
    lastName: string
  } | null> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, organizationId },
      include: {
        user: { select: { locale: true } },
        event: { include: { organization: { select: { name: true, bankAccount: true } } } },
      },
    })
    if (!application) return null
    const first = application.userId
      ? await this.prisma.application.findFirst({
          where: { userId: application.userId },
          orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
          select: { locale: true },
        })
      : null
    return {
      email: application.email,
      number: application.number,
      locale: resolveChangeEmailLocale({
        userLocale: application.user?.locale ?? null,
        firstApplicationLocale: first?.locale ?? application.locale,
      }),
      eventName: application.event.name,
      organizationName: application.event.organization.name,
      bankAccount: application.event.organization.bankAccount,
      accessToken: application.accessToken,
      firstName: application.firstName,
      lastName: application.lastName,
    }
  }

  private async createReceipt(
    tx: Prisma.TransactionClient,
    input: RecordPaymentInput,
  ): Promise<void> {
    const {
      applicationId,
      organizationId,
      recordedById,
      requestId,
      termId,
      isRefund = false,
    } = input
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
      rows = [{ applicationTermId: term.applicationTermId, amountCzk: isRefund ? -amount : amount }]
    } else {
      const amount = resolvePaymentAmount(
        input.amountCzk,
        computePayableAmount(terms.map((term) => term.owedCzk)),
      )
      assertAmount(amount)
      rows = allocatePayment(amount, terms)
    }

    await tx.payment.createMany({
      data: rows.map((row) => ({
        organizationId,
        applicationTermId: row.applicationTermId,
        receiptId: requestId,
        correctsReceiptId: input.correctsReceiptId,
        isSummary: termId === undefined,
        amountCzk: row.amountCzk,
        recordedById,
      })),
    })
    // US-118: the participant is told in the same transaction (a correction counts as a new receipt).
    await this.notifications.notifyPayment(tx, {
      applicationId,
      organizationId,
      kind: isRefund ? "PAYMENT_REFUNDED" : "PAYMENT_RECORDED",
      rows,
    })
  }

  /** Cancels the whole receipt the row belongs to; the rows stay so a retry cannot restore it. */
  async remove(
    applicationId: string,
    organizationId: string,
    receiptId: string,
  ): Promise<PaymentDebtNotice | null> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM application WHERE id = ${applicationId} AND "organizationId" = ${organizationId} FOR UPDATE`
      if (!locked.length) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      const paidBefore = await this.confirmedTermBalances(tx, applicationId)
      const where = {
        receiptId,
        organizationId,
        cancelledAt: null,
        applicationTerm: { applicationId },
      }
      const cancelled = await tx.payment.findMany({
        where,
        select: { applicationTermId: true, amountCzk: true },
      })
      const result = await tx.payment.updateMany({ where, data: { cancelledAt: new Date() } })
      if (!result.count) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      await this.notifications.notifyPayment(tx, {
        applicationId,
        organizationId,
        kind: "PAYMENT_CANCELLED",
        rows: cancelled,
      })
      return this.createdDebt(tx, applicationId, paidBefore)
    })
  }
}

function assertAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount < 1 || amount > 2147483647)
    throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
}
