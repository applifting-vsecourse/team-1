import { Locale } from "@/core/email/locale"
import { parseVariableSymbol } from "@/modules/applications/domain/variable-symbol"
import { QueuedEmailDispatcher } from "@/modules/participants/services/queued-email.dispatcher"
import {
  CandidateWithAfterPayment,
  findCandidates,
  isAssignable,
  withAfterPayment,
} from "@/modules/payments/domain/application-candidates"
import {
  decideMatch,
  InvalidStatementError,
  parseBankStatement,
  ParsedStatement,
} from "@/modules/payments/domain/bank-statement"
import { annotateStatement, RowOutcome } from "@/modules/payments/domain/statement-copy"
import {
  BankTransactionsRepository,
  StoredBankTransaction,
} from "@/modules/payments/repositories/bank-transactions.repository"
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
  /**
   * The uploaded CSV with a column of what happened to each row (US-561). Only handed back in the
   * response, never stored.
   */
  annotatedCsv: string
}

@Injectable()
export class BankStatementsService {
  constructor(
    private readonly repository: BankTransactionsRepository,
    private readonly emailQueue: QueuedEmailDispatcher,
    private readonly access: OrganizationAccessService,
  ) {}

  async import(
    user: Identity,
    eventId: string,
    text: string,
    locale: Locale,
  ): Promise<StatementImportResult> {
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
      annotatedCsv: "",
    }
    const outcomes = new Map<number, RowOutcome>(
      statement.ignoredRecords.map((record) => [record, { kind: "ignored" }]),
    )
    // One row after another: two payments of the same application must see each other's balance.
    for (const [index, row] of statement.incoming.entries()) {
      const record = statement.incomingRecords[index]
      const earlier = await this.repository.find(organizationId, row.externalId)
      if (earlier?.receiptId || earlier?.status === "MATCHED") {
        result.duplicateCount++
        outcomes.set(record, { kind: "duplicate" })
        continue
      }
      const retryOf = earlier?.id
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
            retryOf,
            reason: decision.reason,
            applicationId: decision.applicationId,
          }))
        ) {
          result.duplicateCount++
          outcomes.set(record, { kind: "duplicate" })
          continue
        }
        outcomes.set(record, { kind: "unmatched", reason: decision.reason })
        result.unmatchedCount++
        // Another currency is not counted into the crowns of the summary.
        if (!row.currency || row.currency === "CZK") result.unmatchedCzk += row.amountCents / 100
        continue
      }
      // Deterministic receipt id: the row and its payment commit together, a retry adds nothing.
      const receiptId = `bank:${organizationId}:${row.externalId}`
      const isSaved = await this.repository.saveMatched({
        organizationId,
        eventId,
        importedById: user.id,
        row,
        retryOf,
        applicationId: decision.applicationId,
        termId: decision.termId,
        amountCzk: decision.amountCzk,
        receiptId,
      })
      if (!isSaved) {
        result.duplicateCount++
        outcomes.set(record, { kind: "duplicate" })
        continue
      }
      // #737: the payment queued its e-mail in the same transaction.
      this.emailQueue.kick()
      // A matched decision always comes with the application it was looked up for.
      if (application)
        outcomes.set(record, {
          kind: "matched",
          applicationNumber: application.number,
          termNumber: application.terms.find((term) => term.termId === decision.termId)?.termNumber,
        })
      result.matchedCount++
      result.matchedCzk += decision.amountCzk
      if (decision.overpaidCzk > 0) {
        result.overpaidCount++
        result.overpaidCzk += decision.overpaidCzk
      }
    }
    result.annotatedCsv = annotateStatement(text, statement.headerRecord, outcomes, locale)
    return result
  }

  async listUnmatched(user: Identity, eventId: string): Promise<StoredBankTransaction[]> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return this.repository.listUnmatched(eventId, organizationId)
  }

  /**
   * Applications of the event for the search of a manual match (at most ten). With the transaction
   * the terms carry what its payment would do to them (the debt rules stay in the backend domain).
   */
  async searchCandidates(
    user: Identity,
    eventId: string,
    query: string,
    transactionId?: string,
  ): Promise<CandidateWithAfterPayment[]> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    let amountCzk: number | null = null
    if (transactionId) {
      const transaction = await this.repository.findTransaction(
        transactionId,
        eventId,
        organizationId,
      )
      if (!transaction) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      if (isAssignable(transaction)) amountCzk = transaction.amountCents / 100
    }
    if (query.trim() === "") return []
    return withAfterPayment(
      findCandidates(await this.repository.listCandidateSources(eventId), query),
      amountCzk,
    )
  }

  /**
   * US-562: the organizer assigns an unmatched transaction to one term of an application. The payment
   * is written like an import writes it, under a receipt id of its own; an upload of the statement
   * later counts the row as a duplicate. The payment, the matched status and the queued e-mail no. 8
   * commit together under a lock of the transaction row.
   */
  async match(
    user: Identity,
    eventId: string,
    transactionId: string,
    applicationId: string,
    termId: string,
    previousReceiptId: string | null = null,
  ): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const transaction = await this.repository.findTransaction(
      transactionId,
      eventId,
      organizationId,
    )
    // Not found for this organization and event covers a foreign record: 403 with no content.
    if (!transaction) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    if (transaction.status !== "UNMATCHED")
      throw new AppException(HttpStatus.CONFLICT, "BANK_TRANSACTION_ALREADY_MATCHED")
    if (!isAssignable(transaction))
      throw new AppException(HttpStatus.CONFLICT, "BANK_TRANSACTION_NOT_ASSIGNABLE")
    if (!(await this.repository.applicationBelongsToEvent(eventId, applicationId)))
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const outcome = await this.repository.assign({
      id: transaction.id,
      eventId,
      organizationId,
      recordedById: user.id,
      applicationId,
      termId,
      previousReceiptId,
    })
    // The row was matched or moved to another event after it was read.
    if (!outcome) throw new AppException(HttpStatus.CONFLICT, "BANK_TRANSACTION_ALREADY_MATCHED")
    // Amount or currency changed by a re-import after it was read.
    if (outcome === "NOT_ASSIGNABLE")
      throw new AppException(HttpStatus.CONFLICT, "BANK_TRANSACTION_NOT_ASSIGNABLE")
    this.emailQueue.kick()
  }
}
