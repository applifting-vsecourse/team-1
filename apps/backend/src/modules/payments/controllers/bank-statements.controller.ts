import { Locale } from "@/core/email/locale"
import {
  StatementImportResponseDto,
  UnmatchedTransactionsResponseDto,
} from "@/modules/payments/controllers/dto/bank-statement.response.dto"
import { BankStatementsService } from "@/modules/payments/services/bank-statements.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { RequestLocale } from "@/shared/i18n/request-locale"
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common"
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
}
