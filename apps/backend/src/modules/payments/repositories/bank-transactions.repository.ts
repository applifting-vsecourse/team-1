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

  async exists(organizationId: string, externalId: string): Promise<boolean> {
    const found = await this.prisma.bankTransaction.findUnique({
      where: { organizationId_externalId: { organizationId, externalId } },
      select: { id: true },
    })
    return found !== null
  }

  /** @returns false when the same transaction was stored meanwhile (a parallel upload). */
  async save(input: {
    organizationId: string
    eventId: string
    importedById: string
    row: StatementRow
    applicationId?: string
    receiptId?: string
    reason?: UnmatchedReason
  }): Promise<boolean> {
    const { row } = input
    try {
      await this.prisma.bankTransaction.create({
        data: {
          organizationId: input.organizationId,
          eventId: input.eventId,
          importedById: input.importedById,
          externalId: row.externalId,
          bookedOn: new Date(`${row.bookedOn}T00:00:00.000Z`),
          amountCents: row.amountCents,
          variableSymbol: row.variableSymbol,
          counterpartyName: row.counterpartyName,
          message: row.message,
          status: input.reason ? "UNMATCHED" : "MATCHED",
          reason: input.reason,
          receiptId: input.receiptId,
          applicationId: input.applicationId,
        },
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
