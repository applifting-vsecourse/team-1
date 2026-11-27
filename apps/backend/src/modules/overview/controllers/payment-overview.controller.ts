import {
  OutstandingOverpaymentDto,
  PaymentOverviewResponseDto,
} from "@/modules/overview/controllers/dto/payment-overview.response.dto"
import { PaymentOverviewService } from "@/modules/overview/services/payment-overview.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, Param } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("overview")
@Auth("ORGANIZER")
@Controller("organizer/events/:eventId/payments")
export class PaymentOverviewController {
  constructor(private readonly payments: PaymentOverviewService) {}

  @Get("overpayments")
  @ApiOperation({ summary: "Outstanding overpayments per application in a term" })
  @ApiResponse({ status: 200, type: [OutstandingOverpaymentDto] })
  @ApiResponse({ status: 401, description: "Session required" })
  @ApiResponse({ status: 403, description: "Wrong account type, foreign or missing event" })
  async getOverpayments(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<OutstandingOverpaymentDto[]> {
    return (await this.payments.getOverpayments(user, eventId)).map((entry) => ({
      ...entry,
      startsOn: entry.startsOn.toISOString().slice(0, 10),
      endsOn: entry.endsOn.toISOString().slice(0, 10),
    }))
  }

  @Get()
  @ApiOperation({ summary: "Confirmed applications in terms with payment status and debt" })
  @ApiResponse({ status: 200, type: PaymentOverviewResponseDto })
  @ApiResponse({ status: 401, description: "Session required" })
  @ApiResponse({ status: 403, description: "Wrong account type, foreign or missing event" })
  async get(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<PaymentOverviewResponseDto> {
    return PaymentOverviewResponseDto.fromDomain(await this.payments.get(user, eventId))
  }
}
