import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeTermOwed, computeTermPaid } from "@/modules/applications/domain/pricing"
import { CandidateSource } from "@/modules/payments/domain/application-candidates"
import {
  FoundApplication,
  StatementRow,
  UnmatchedReason,
} from "@/modules/payments/domain/bank-statement"
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
  application: { id: string; firstName: string; lastName: string } | null
}

@Injectable()
export class BankTransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    externalId: string
    status: "MATCHED" | "UNMATCHED"
    amountCents: number
    currency: string
  } | null> {
    return this.prisma.bankTransaction.findFirst({
      where: { id, eventId, organizationId },
      select: { id: true, externalId: true, status: true, amountCents: true, currency: true },
    })
  }

  /** @returns false when the transaction was matched meanwhile. */
  async markMatched(id: string, applicationId: string, receiptId: string): Promise<boolean> {
    const result = await this.prisma.bankTransaction.updateMany({
      where: { id, status: "UNMATCHED" },
      data: { status: "MATCHED", reason: null, applicationId, receiptId },
    })
    return result.count === 1
  }

  /** An earlier import of the same operation: matched ones are final, unmatched ones may be retried. */
  async find(
    organizationId: string,
    externalId: string,
  ): Promise<{ id: string; status: "MATCHED" | "UNMATCHED" } | null> {
    return this.prisma.bankTransaction.findUnique({
      where: { organizationId_externalId: { organizationId, externalId } },
      select: { id: true, status: true },
    })
  }

  /**
   * Stores the transaction; with `retryOf` the earlier unmatched import is replaced, e.g. when the
   * statement of two events is uploaded to the other event next.
   * @returns false when it was stored (or matched) meanwhile by a parallel upload.
   */
  async save(input: {
    organizationId: string
    eventId: string
    importedById: string
    row: StatementRow
    retryOf?: string
    applicationId?: string
    receiptId?: string
    reason?: UnmatchedReason
  }): Promise<boolean> {
    const { row } = input
    const data = {
      eventId: input.eventId,
      importedById: input.importedById,
      bookedOn: new Date(`${row.bookedOn}T00:00:00.000Z`),
      amountCents: row.amountCents,
      currency: row.currency ?? "CZK",
      variableSymbol: row.variableSymbol,
      counterpartyName: row.counterpartyName,
      message: row.message,
      status: input.reason ? ("UNMATCHED" as const) : ("MATCHED" as const),
      reason: input.reason ?? null,
      receiptId: input.receiptId ?? null,
      applicationId: input.applicationId ?? null,
    }
    if (input.retryOf) {
      const result = await this.prisma.bankTransaction.updateMany({
        where: { id: input.retryOf, status: "UNMATCHED" },
        data,
      })
      return result.count === 1
    }
    try {
      await this.prisma.bankTransaction.create({
        data: { ...data, organizationId: input.organizationId, externalId: row.externalId },
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
      application: row.application,
    }))
  }
}
