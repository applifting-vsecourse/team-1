import { createHash } from "node:crypto"
import { Locale } from "@/core/email/locale"
import { PrismaEmailJobRepository } from "@/core/email/queue/prisma-email-job.repository"
import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computePaymentDeadline } from "@/modules/applications/domain/payment-deadline"
import { planPaymentDebtRenewal } from "@/modules/applications/domain/payment-debt-renewal"
import {
  allocatePayment,
  computePayableAmount,
  computeRefundableAmount,
  computeSummaryPayableAmount,
  computeTermDue,
  computeTermOwed,
  computeTermPaid,
  resolvePaymentAmount,
} from "@/modules/applications/domain/pricing"
import { NotificationsRepository } from "@/modules/notifications/repositories/notifications.repository"
import { resolveChangeEmailLocale } from "@/modules/participants/domain/change-email-locale"
import { queuedEmailJob } from "@/modules/participants/domain/queued-email"
import { manualMatchReason, UnmatchedReason } from "@/modules/payments/domain/bank-statement"
import { PaymentApplication } from "@/modules/payments/domain/payment"
import {
  paymentReceivedMessage,
  planPaymentConfirmations,
} from "@/modules/payments/domain/payment-confirmation"
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
  pronouns: row.pronouns,
  individualAccommodation: row.individualAccommodation,
  accommodationRequest: row.accommodationRequest,
  birthDate: row.birthDate,
  gender: row.gender,
  email: row.email,
  phone: row.phone,
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
  /** Defaults to a manually recorded payment. */
  source?: "MANUAL" | "SIMULATION" | "BANK_IMPORT"
}

export type PaymentDebtNotice = {
  amountOwedCzk: number
  terms: (PaidTermNotice & {
    termNumber: number
    amountOwedCzk: number
    paymentDueAt: Date | null
  })[]
}

/** A confirmed term whose debt a payment closed (e-mail no. 8, US-117). */
export type PaidTermNotice = {
  name: string | null
  startsOn: Date
  endsOn: Date
}

/** A paid term with the id of its application term. */
type ClosedTerm = PaidTermNotice & { id: string }

@Injectable()
export class PaymentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsRepository,
    private readonly emailJobs: PrismaEmailJobRepository,
  ) {}

  async find(applicationId: string, organizationId: string): Promise<PaymentApplication | null> {
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId, organizationId },
      include,
    })
    return row ? toDomain(row) : null
  }

  /** The organization of an application of this participant; `null` for someone else's or a missing one. */
  async findOrganizationOfUser(userId: string, applicationId: string): Promise<string | null> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      select: { organizationId: true },
    })
    return application?.organizationId ?? null
  }

  /**
   * Each submission is one receipt of one or more rows. Balance resolution is serialized by a
   * lock on the application and retries of the same `requestId` add nothing.
   */
  async record(input: RecordPaymentInput): Promise<PaidTermNotice[]> {
    return this.prisma.$transaction((tx) => this.recordWithin(tx, input))
  }

  /**
   * `record` inside the transaction of the caller, so the payment commits together with its other
   * writes. A payment of a bank transaction (`BANK_IMPORT`) also queues e-mail no. 8 here and the
   * caller starts the queue after the commit; for the other sources the caller sends it.
   */
  async recordWithin(
    tx: Prisma.TransactionClient,
    input: RecordPaymentInput,
  ): Promise<PaidTermNotice[]> {
    const { applicationId, organizationId, requestId, termId, isRefund = false } = input
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
        (input.amountCzk !== undefined && total !== (isRefund ? -input.amountCzk : input.amountCzk))
      )
        throw new AppException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_RECORDED")
      return []
    }

    const owedBefore = await this.confirmedTermBalances(tx, applicationId)
    await this.createReceipt(tx, input)
    const paid = await this.closedDebts(tx, applicationId, owedBefore)
    if (input.source === "BANK_IMPORT") await this.queuePaymentReceived(tx, input, paid)
    return paid
  }

  private async queuePaymentReceived(
    tx: Prisma.TransactionClient,
    { applicationId, organizationId, requestId }: RecordPaymentInput,
    paid: ClosedTerm[],
  ): Promise<void> {
    if (!paid.length) return
    const context = await this.findEmailContext(applicationId, organizationId, tx)
    if (!context) return
    const { eventId } = await tx.application.findUniqueOrThrow({
      where: { id: applicationId },
      select: { eventId: true },
    })
    // The terms the e-mail names, an overpaid one included.
    const settledTermIds = paid.map((term) => term.id)
    // Hashed: a receipt id of a bank row can be longer than a provider's idempotency key.
    const receipt = createHash("sha256").update(`${applicationId}:${requestId}`).digest("hex")
    await this.emailJobs.enqueue(tx, [
      queuedEmailJob({ organizationId, eventId, applicationId }, `payment-received:${receipt}`, {
        template: "PAYMENT_RECEIVED",
        data: paymentReceivedMessage(context, paid),
        basis: { receiptId: requestId, settledTermIds },
      }),
    ])
  }

  /** A correction cancels and replaces a whole receipt under the same application lock. */
  async correct(
    input: RecordPaymentInput & { receiptId: string },
  ): Promise<{ debt: PaymentDebtNotice | null; paid: PaidTermNotice[] }> {
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
        return { debt: null, paid: [] }
      }
      if (original.some((row) => row.cancelledAt !== null))
        throw new AppException(HttpStatus.CONFLICT, "PAYMENT_RECEIPT_ALREADY_CANCELLED")
      const paidBefore = await this.confirmedTermBalances(tx, applicationId)
      await tx.payment.updateMany({
        where: { receiptId, organizationId, applicationTerm: { applicationId } },
        data: { cancelledAt: new Date() },
      })
      await this.createReceipt(tx, { ...input, correctsReceiptId: receiptId })
      return {
        debt: await this.createdDebt(tx, applicationId, paidBefore),
        paid: await this.closedDebts(tx, applicationId, paidBefore),
      }
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
      name: string | null
      startsOn: Date
      endsOn: Date
    }[]
  > {
    const terms = await tx.applicationTerm.findMany({
      where: { applicationId, status: "CONFIRMED" },
      include: {
        term: { select: { number: true, name: true, startsOn: true, endsOn: true } },
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
      name: term.term.name,
      startsOn: term.term.startsOn,
      endsOn: term.term.endsOn,
    }))
  }

  /** Terms whose debt the change inside this transaction closed (US-117). */
  private async closedDebts(
    tx: Prisma.TransactionClient,
    applicationId: string,
    before: { id: string; owedCzk: number }[],
  ): Promise<ClosedTerm[]> {
    const after = await this.confirmedTermBalances(tx, applicationId)
    return planPaymentConfirmations(before, after).map(({ id, name, startsOn, endsOn }) => ({
      id,
      name,
      startsOn,
      endsOn,
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
      name: term.name,
      startsOn: term.startsOn,
      endsOn: term.endsOn,
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
    client: Prisma.TransactionClient = this.prisma,
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
    const application = await client.application.findFirst({
      where: { id: applicationId, organizationId },
      include: {
        user: { select: { locale: true } },
        event: { include: { organization: { select: { name: true, bankAccount: true } } } },
      },
    })
    if (!application) return null
    const first = application.userId
      ? await client.application.findFirst({
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
      if (isRefund) {
        const maximum = computeRefundableAmount(term.due, term.paid)
        if (amount > maximum)
          throw new AppException(HttpStatus.CONFLICT, "REFUND_EXCEEDS_OVERPAYMENT", undefined, {
            maximum: String(maximum),
            context: "limit",
          })
      }
      rows = [{ applicationTermId: term.applicationTermId, amountCzk: isRefund ? -amount : amount }]
    } else {
      const amount = resolvePaymentAmount(input.amountCzk, computeSummaryPayableAmount(terms))
      assertAmount(amount)
      rows = allocatePayment(amount, terms)
      if (rows.length === 0) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    }

    await tx.payment.createMany({
      data: rows.map((row) => ({
        organizationId,
        applicationTermId: row.applicationTermId,
        receiptId: requestId,
        correctsReceiptId: input.correctsReceiptId,
        isSummary: termId === undefined,
        amountCzk: row.amountCzk,
        source: input.source,
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

  /**
   * Corrections replace a receipt but keep its lineage. Older bank receipts share a format
   * across automatic import and manual assignment, so their bank row needs a separate check.
   */
  private async findBankReceipt(
    tx: Prisma.TransactionClient,
    applicationId: string,
    organizationId: string,
    receiptId: string,
  ): Promise<string | undefined> {
    const [assignment] = await tx.$queryRaw<{ receiptId: string }[]>`
      WITH RECURSIVE receipt_chain AS (
        SELECT p."receiptId", p."correctsReceiptId"
        FROM payment p JOIN application_term t ON t.id = p."applicationTermId"
        WHERE p."receiptId" = ${receiptId}
          AND p."organizationId" = ${organizationId} AND t."applicationId" = ${applicationId}
        UNION
        SELECT p."receiptId", p."correctsReceiptId"
        FROM receipt_chain r JOIN payment p ON p."receiptId" = r."correctsReceiptId"
        JOIN application_term t ON t.id = p."applicationTermId"
        WHERE p."organizationId" = ${organizationId} AND t."applicationId" = ${applicationId}
      )
      SELECT "receiptId" FROM receipt_chain
      WHERE "receiptId" LIKE 'bank-manual:%' OR "receiptId" LIKE 'bank:%'
    `
    return assignment?.receiptId
  }

  /** Cancels the whole receipt the row belongs to; the rows stay so a retry cannot restore it. */
  async remove(
    applicationId: string,
    organizationId: string,
    receiptId: string,
  ): Promise<PaymentDebtNotice | null> {
    return this.prisma.$transaction(async (tx) => {
      const assignmentReceipt = await this.findBankReceipt(
        tx,
        applicationId,
        organizationId,
        receiptId,
      )
      // Match and import lock the bank row before locking the application.
      if (assignmentReceipt) {
        const where = {
          organizationId,
          applicationId,
          receiptId: assignmentReceipt,
          status: "MATCHED" as const,
        }
        // A legacy `bank:` receipt is shared with the automatic import: it is reopened only when
        // the symbol and the original receipt show that the import could not have made the match.
        let legacyReason: UnmatchedReason | null = null
        if (assignmentReceipt.startsWith("bank:")) {
          const row = await tx.bankTransaction.findFirst({
            where,
            select: { variableSymbol: true, application: { select: { number: true } } },
          })
          if (row?.application) {
            const original = await tx.payment.findMany({
              where: {
                receiptId: assignmentReceipt,
                organizationId,
                applicationTerm: { applicationId },
              },
              select: {
                isSummary: true,
                applicationTerm: { select: { term: { select: { number: true } } } },
              },
            })
            legacyReason = manualMatchReason(
              row.variableSymbol,
              row.application.number,
              original.map((payment) => ({
                isSummary: payment.isSummary,
                termNumber: payment.applicationTerm.term.number,
              })),
            )
          }
        }
        if (assignmentReceipt.startsWith("bank-manual:") || legacyReason)
          await tx.bankTransaction.updateMany({
            where,
            data: {
              status: "UNMATCHED",
              applicationId: null,
              ...(legacyReason && { reason: legacyReason }),
            },
          })
      }
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
