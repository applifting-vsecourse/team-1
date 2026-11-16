import { parseVariableSymbol } from "@/modules/applications/domain/variable-symbol"
import {
  decideMatch,
  InvalidStatementError,
  parseBankStatement,
  ParsedStatement,
} from "@/modules/payments/domain/bank-statement"
import {
  BankTransactionsRepository,
  StoredBankTransaction,
} from "@/modules/payments/repositories/bank-transactions.repository"
import { PaymentsService } from "@/modules/payments/services/payments.service"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

export type StatementImportResult = {
  matchedCount: number
  matchedCzk: number
  unmatchedCount: number
  unmatchedCzk: number
  /** Matched payments that exceed what the application owed, and by how much in total. */
  overpaidCount: number
  overpaidCzk: number
  /** Transactions already imported by an earlier upload; not counted again. */
  duplicateCount: number
  /** Outgoing transactions of the statement. */
  ignoredCount: number
}

@Injectable()
export class BankStatementsService {
  constructor(
    private readonly repository: BankTransactionsRepository,
    private readonly payments: PaymentsService,
    private readonly access: OrganizationAccessService,
  ) {}

  async import(user: Identity, eventId: string, text: string): Promise<StatementImportResult> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    let statement: ParsedStatement
    try {
      statement = parseBankStatement(text)
    } catch (error) {
      if (error instanceof InvalidStatementError)
        throw new AppException(HttpStatus.BAD_REQUEST, "BANK_STATEMENT_INVALID")
      throw error
    }
    const result: StatementImportResult = {
      matchedCount: 0,
      matchedCzk: 0,
      unmatchedCount: 0,
      unmatchedCzk: 0,
      overpaidCount: 0,
      overpaidCzk: 0,
      duplicateCount: 0,
      ignoredCount: statement.ignoredCount,
    }
    // One row after another: two payments of the same application must see each other's balance.
    for (const row of statement.incoming) {
      if (await this.repository.exists(organizationId, row.externalId)) {
        result.duplicateCount++
        continue
      }
      const parsed = row.variableSymbol ? parseVariableSymbol(row.variableSymbol) : null
      const application = parsed
        ? await this.repository.findApplication(eventId, parsed.applicationNumber)
        : null
      const decision = decideMatch(row, application)
      if (decision.kind === "unmatched") {
        if (
          !(await this.repository.save({
            organizationId,
            eventId,
            importedById: user.id,
            row,
            reason: decision.reason,
            applicationId: decision.applicationId,
          }))
        ) {
          result.duplicateCount++
          continue
        }
        result.unmatchedCount++
        result.unmatchedCzk += row.amountCents / 100
        continue
      }
      // Deterministic receipt id: when the upload dies between payment and row, the retry adds nothing.
      const receiptId = `bank:${organizationId}:${row.externalId}`
      await this.payments.record(
        user,
        decision.applicationId,
        receiptId,
        decision.amountCzk,
        decision.termId,
        "BANK_IMPORT",
      )
      if (
        !(await this.repository.save({
          organizationId,
          eventId,
          importedById: user.id,
          row,
          applicationId: decision.applicationId,
          receiptId,
        }))
      ) {
        result.duplicateCount++
        continue
      }
      result.matchedCount++
      result.matchedCzk += decision.amountCzk
      if (decision.overpaidCzk > 0) {
        result.overpaidCount++
        result.overpaidCzk += decision.overpaidCzk
      }
    }
    return result
  }

  async listUnmatched(user: Identity, eventId: string): Promise<StoredBankTransaction[]> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return this.repository.listUnmatched(eventId, organizationId)
  }
}
