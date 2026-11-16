import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeTermOwed } from "@/modules/applications/domain/pricing"
import {
  MatchableApplication,
  StatementRow,
  UnmatchedReason,
} from "@/modules/payments/domain/bank-statement"
import { Injectable } from "@nestjs/common"

export type StoredBankTransaction = {
  id: string
  bookedOn: Date
  amountCents: number
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
  async findApplication(eventId: string, number: number): Promise<MatchableApplication | null> {
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
      terms: application.terms.map((applicationTerm) => ({
        termId: applicationTerm.termId,
        termNumber: applicationTerm.term.number,
        status: applicationTerm.status,
        owedCzk: computeTermOwed(applicationTerm, applicationTerm.payments),
      })),
    }
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
      variableSymbol: row.variableSymbol,
      counterpartyName: row.counterpartyName,
      message: row.message,
      reason: row.reason as UnmatchedReason,
      application: row.application,
    }))
  }
}
