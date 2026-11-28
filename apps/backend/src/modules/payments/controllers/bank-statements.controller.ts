import { Locale } from "@/core/email/locale"
import {
  StatementImportResponseDto,
  UnmatchedTransactionsResponseDto,
} from "@/modules/payments/controllers/dto/bank-statement.response.dto"
import {
  ApplicationCandidatesQueryDto,
  ApplicationCandidatesResponseDto,
  MatchBankTransactionRequestDto,
} from "@/modules/payments/controllers/dto/bank-transaction-match.dto"
import { BankStatementsService } from "@/modules/payments/services/bank-statements.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { RequestLocale } from "@/shared/i18n/request-locale"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  ValidationPipe,
} from "@nestjs/common"
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("payments")
@Auth("ORGANIZER")
@Controller("organizer/events/:eventId")
export class BankStatementsController {
  constructor(private readonly statements: BankStatementsService) {}

  @Post("bank-statements")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Upload a bank statement (Fio CSV or a generic CSV) as the raw text; matches payments by variable symbol (US-42). The response carries a copy of the CSV with the result of each row (US-561); nothing is stored",
  })
  @ApiConsumes("text/csv")
  @ApiBody({ schema: { type: "string" } })
  @ApiResponse({ status: 200, type: StatementImportResponseDto })
  @ApiResponse({ status: 400, description: "BANK_STATEMENT_INVALID" })
  async upload(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Body() body: unknown,
    @RequestLocale() locale: Locale,
  ): Promise<StatementImportResponseDto> {
    if (!Buffer.isBuffer(body) || body.length === 0)
      throw new AppException(HttpStatus.BAD_REQUEST, "BANK_STATEMENT_INVALID")
    return StatementImportResponseDto.fromDomain(
      await this.statements.import(user, eventId, body.toString("utf8"), locale),
    )
  }

  @Get("bank-transactions/unmatched")
  @ApiOperation({ summary: "Imported transactions that were not matched, with the reason" })
  @ApiResponse({ status: 200, type: UnmatchedTransactionsResponseDto })
  async unmatched(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<UnmatchedTransactionsResponseDto> {
    return UnmatchedTransactionsResponseDto.fromDomain(
      await this.statements.listUnmatched(user, eventId),
    )
  }

  @Get("bank-transactions/application-candidates")
  @ApiOperation({
    summary:
      "Applications of the event for the manual match of a transaction (US-562): by a part of the name, a variable symbol or an application number; at most ten, each with what its terms owe",
  })
  @ApiResponse({ status: 200, type: ApplicationCandidatesResponseDto })
  @ApiResponse({ status: 400, description: "VALIDATION_FAILED" })
  async candidates(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    query: ApplicationCandidatesQueryDto,
  ): Promise<ApplicationCandidatesResponseDto> {
    return ApplicationCandidatesResponseDto.fromDomain(
      await this.statements.searchCandidates(user, eventId, query.q ?? "", query.transactionId),
    )
  }

  @Post("bank-transactions/:id/match")
  @HttpCode(204)
  @ApiOperation({
    summary:
      "Assigns an unmatched transaction to one term of an application as a payment of source BANK_IMPORT (US-562)",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: "PAYMENT_TERM_NOT_IN_APPLICATION" })
  @ApiResponse({
    status: 409,
    description:
      "BANK_TRANSACTION_ALREADY_MATCHED, BANK_TRANSACTION_NOT_ASSIGNABLE, BANK_TRANSACTION_CHANGED",
  })
  async match(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("id") id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    body: MatchBankTransactionRequestDto,
  ): Promise<void> {
    await this.statements.match(user, eventId, id, body)
  }
}
