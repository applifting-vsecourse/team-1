import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeTermOwed, computeTermPaid } from "@/modules/applications/domain/pricing"
import { CandidateSource, isAssignable } from "@/modules/payments/domain/application-candidates"
import {
  FoundApplication,
  StatementRow,
  UnmatchedReason,
} from "@/modules/payments/domain/bank-statement"
import { PaymentsRepository } from "@/modules/payments/repositories/payments.repository"
import { Injectable } from "@nestjs/common"

export type StoredBankTransaction = {
  id: string
  bookedOn: Date
  amountCents: number
  currency: string
  variableSymbol: string | null
  counterpartyName: string | null
  message: string | null
  reason: UnmatchedReason
  previousReceiptId: string | null
  application: { id: string; firstName: string; lastName: string } | null
}

@Injectable()
export class BankTransactionsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsRepository,
  ) {}

  /** The application of the event with this number and what each of its terms still owes. */
  async findApplication(eventId: string, number: number): Promise<FoundApplication | null> {
    const application = await this.prisma.application.findFirst({
      where: { eventId, number },
      include: {
        terms: {
          include: {
            term: { select: { number: true } },
            payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
          },
        },
      },
    })
    if (!application) return null
    return {
      id: application.id,
      number: application.number,
      terms: application.terms.map((applicationTerm) => ({
        termId: applicationTerm.termId,
        termNumber: applicationTerm.term.number,
        status: applicationTerm.status,
        owedCzk: computeTermOwed(applicationTerm, applicationTerm.payments),
      })),
    }
  }

  /** The applications of the event with what each term owes and has paid, for the search of a manual match. */
  async listCandidateSources(eventId: string): Promise<CandidateSource[]> {
    const rows = await this.prisma.application.findMany({
      where: { eventId },
      include: {
        terms: {
          orderBy: { term: { startsOn: "asc" } },
          include: {
            term: { select: { number: true, name: true, startsOn: true, endsOn: true } },
            payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
          },
        },
      },
    })
    const day = (date: Date): string => date.toISOString().slice(0, 10)
    return rows.map((application) => ({
      id: application.id,
      number: application.number,
      firstName: application.firstName,
      lastName: application.lastName,
      terms: application.terms.map((applicationTerm) => ({
        termId: applicationTerm.termId,
        termNumber: applicationTerm.term.number,
        name: applicationTerm.term.name,
        startsOn: day(applicationTerm.term.startsOn),
        endsOn: day(applicationTerm.term.endsOn),
        status: applicationTerm.status,
        owedCzk: computeTermOwed(applicationTerm, applicationTerm.payments),
        paidCzk: computeTermPaid(applicationTerm.payments),
      })),
    }))
  }

  async applicationBelongsToEvent(eventId: string, applicationId: string): Promise<boolean> {
    return (await this.prisma.application.count({ where: { id: applicationId, eventId } })) === 1
  }

  /** A stored transaction of the organization and event, whatever its status. */
  async findTransaction(
    id: string,
    eventId: string,
    organizationId: string,
  ): Promise<{
    id: string
    status: "MATCHED" | "UNMATCHED"
    amountCents: number
    currency: string
    reason: UnmatchedReason | null
  } | null> {
    const row = await this.prisma.bankTransaction.findFirst({
      where: { id, eventId, organizationId },
      select: {
        id: true,
        status: true,
        amountCents: true,
        currency: true,
        reason: true,
      },
    })
    return row && { ...row, reason: row.reason as UnmatchedReason | null }
  }

  /**
   * US-562: writes the payment and marks the transaction matched in one database transaction. The
   * row of the bank transaction is locked first (and must still belong to the event and
   * organization it was read for), so a parallel assignment or import of the same transaction waits
   * and then finds it matched; the payment lock of `PaymentsRepository.record` is per application
   * only. The amount and currency are read from the locked row, so a re-import that changed them
   * meanwhile is honoured. Nothing is written when the transaction is not unmatched any more.
   * @returns "ASSIGNED", "NOT_ASSIGNABLE" when the locked row is not in whole crowns, or null when
   * the transaction is not an unmatched one of this event and organization.
   */
  async assign(input: {
    id: string
    eventId: string
    organizationId: string
    recordedById: string
    applicationId: string
    termId: string
    previousReceiptId: string | null
  }): Promise<"ASSIGNED" | "NOT_ASSIGNABLE" | null> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { amountCents: number; currency: string }[]
      >`SELECT "amountCents", currency FROM bank_transaction WHERE id = ${input.id} AND "eventId" = ${input.eventId} AND "organizationId" = ${input.organizationId} AND status = 'UNMATCHED' AND "receiptId" IS NOT DISTINCT FROM ${input.previousReceiptId}::text FOR UPDATE`
      if (!locked.length) return null
      const [row] = locked
      if (!isAssignable(row)) return "NOT_ASSIGNABLE"
      // The locked row and the previously displayed receipt prevent a stale retry from
      // matching a transaction again after cancellation.
      const receiptId = `bank-manual:${randomUUID()}`
      // The application is locked by recordWithin before the row gets a foreign key to it.
      await this.payments.recordWithin(tx, {
        applicationId: input.applicationId,
        organizationId: input.organizationId,
        recordedById: input.recordedById,
        requestId: receiptId,
        amountCzk: row.amountCents / 100,
        termId: input.termId,
        source: "BANK_IMPORT",
      })
      await tx.bankTransaction.update({
        where: { id: input.id },
        data: {
          status: "MATCHED",
          // Keep the original unmatched reason for a later cancellation.
          applicationId: input.applicationId,
          receiptId,
        },
      })
      return "ASSIGNED"
    })
  }

  /**
   * Import of a row that matched an application: the row and its payment are written in one
   * database transaction, under the lock of an earlier unmatched row (`retryOf`) or the unique key of
   * a new one. The row is reserved without the application first and gets its `applicationId` only
   * after `recordWithin` locked the application: the foreign key check would otherwise hold a shared
   * lock on the application in two parallel imports and both would then wait for the exclusive one
   * (deadlock).
   * @returns false when a parallel upload or assignment stored or matched the row first.
   */
  async saveMatched(input: {
    organizationId: string
    eventId: string
    importedById: string
    row: StatementRow
    retryOf?: string
    applicationId: string
    termId?: string
    amountCzk: number
    receiptId: string
  }): Promise<boolean> {
    const data = {
      ...this.rowData(input),
      status: "MATCHED" as const,
      reason: null,
      receiptId: input.receiptId,
      applicationId: null,
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        let id: string
        if (input.retryOf) {
          const locked = await tx.$queryRaw<
            { id: string }[]
          >`SELECT id FROM bank_transaction WHERE id = ${input.retryOf} AND "organizationId" = ${input.organizationId} AND status = 'UNMATCHED' AND "receiptId" IS NULL FOR UPDATE`
          if (!locked.length) return false
          id = input.retryOf
          await tx.bankTransaction.update({ where: { id }, data })
        } else {
          ;({ id } = await tx.bankTransaction.create({
            data: {
              ...data,
              organizationId: input.organizationId,
              externalId: input.row.externalId,
            },
            select: { id: true },
          }))
        }
        await this.payments.recordWithin(tx, {
          applicationId: input.applicationId,
          organizationId: input.organizationId,
          recordedById: input.importedById,
          requestId: input.receiptId,
          amountCzk: input.amountCzk,
          termId: input.termId,
          source: "BANK_IMPORT",
        })
        await tx.bankTransaction.update({
          where: { id },
          data: { applicationId: input.applicationId },
        })
        return true
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        return false
      throw error
    }
  }

  /** A re-import may retry untouched unmatched rows. A previously assigned row stays with the organizer. */
  async find(
    organizationId: string,
    externalId: string,
  ): Promise<{ id: string; status: "MATCHED" | "UNMATCHED"; receiptId: string | null } | null> {
    return this.prisma.bankTransaction.findUnique({
      where: { organizationId_externalId: { organizationId, externalId } },
      select: { id: true, status: true, receiptId: true },
    })
  }

  private rowData(input: { eventId: string; importedById: string; row: StatementRow }): {
    eventId: string
    importedById: string
    bookedOn: Date
    amountCents: number
    currency: string
    variableSymbol: string | null
    counterpartyName: string | null
    message: string | null
  } {
    const { row } = input
    return {
      eventId: input.eventId,
      importedById: input.importedById,
      bookedOn: new Date(`${row.bookedOn}T00:00:00.000Z`),
      amountCents: row.amountCents,
      currency: row.currency ?? "CZK",
      variableSymbol: row.variableSymbol,
      counterpartyName: row.counterpartyName,
      message: row.message,
    }
  }

  /**
   * Stores an unmatched transaction; with `retryOf` the earlier unmatched import is replaced, e.g.
   * when the statement of two events is uploaded to the other event next.
   * @returns false when it was stored (or matched) meanwhile by a parallel upload.
   */
  async save(input: {
    organizationId: string
    eventId: string
    importedById: string
    row: StatementRow
    retryOf?: string
    applicationId?: string
    reason: UnmatchedReason
  }): Promise<boolean> {
    const data = {
      ...this.rowData(input),
      status: "UNMATCHED" as const,
      reason: input.reason,
      receiptId: null,
      applicationId: input.applicationId ?? null,
    }
    if (input.retryOf) {
      const result = await this.prisma.bankTransaction.updateMany({
        where: {
          id: input.retryOf,
          organizationId: input.organizationId,
          status: "UNMATCHED",
          receiptId: null,
        },
        data,
      })
      return result.count === 1
    }
    try {
      await this.prisma.bankTransaction.create({
        data: { ...data, organizationId: input.organizationId, externalId: input.row.externalId },
      })
      return true
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        return false
      throw error
    }
  }

  async listUnmatched(eventId: string, organizationId: string): Promise<StoredBankTransaction[]> {
    const rows = await this.prisma.bankTransaction.findMany({
      where: { eventId, organizationId, status: "UNMATCHED" },
      orderBy: [{ bookedOn: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      include: { application: { select: { id: true, firstName: true, lastName: true } } },
    })
    return rows.map((row) => ({
      id: row.id,
      bookedOn: row.bookedOn,
      amountCents: row.amountCents,
      currency: row.currency,
      variableSymbol: row.variableSymbol,
      counterpartyName: row.counterpartyName,
      message: row.message,
      reason: row.reason as UnmatchedReason,
      previousReceiptId: row.receiptId,
      application: row.application,
    }))
  }
}
