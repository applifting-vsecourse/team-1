import { PaymentApplicationResponseDto } from "@/modules/payments/controllers/dto/payment-application.response.dto"
import { RecordPaymentRequestDto } from "@/modules/payments/controllers/dto/record-payment.request.dto"
import { PaymentsService } from "@/modules/payments/services/payments.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("payments")
@Controller("organizer/applications/:applicationId/payments")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: "Payment detail of an application (US-44)" })
  @ApiResponse({ status: 200, type: PaymentApplicationResponseDto })
  async get(
    @User() user: Identity,
    @Param("applicationId") id: string,
  ): Promise<PaymentApplicationResponseDto> {
    return PaymentApplicationResponseDto.fromDomain(await this.payments.get(user, id))
  }

  @Post()
  @HttpCode(204)
  @ApiOperation({ summary: "Record a payment; omitted amount means full amount due" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, description: "A payment is already recorded" })
  async create(
    @User() user: Identity,
    @Param("applicationId") id: string,
    @Body() body: RecordPaymentRequestDto,
  ): Promise<void> {
    await this.payments.save(user, id, body.amountCzk)
  }

  @Patch(":paymentId")
  @HttpCode(204)
  @ApiOperation({ summary: "Correct a recorded payment" })
  @ApiResponse({ status: 204 })
  async update(
    @User() user: Identity,
    @Param("applicationId") id: string,
    @Param("paymentId") paymentId: string,
    @Body() body: RecordPaymentRequestDto,
  ): Promise<void> {
    await this.payments.save(user, id, body.amountCzk, paymentId)
  }

  @Delete(":paymentId")
  @HttpCode(204)
  @ApiOperation({ summary: "Cancel a mistakenly recorded payment" })
  @ApiResponse({ status: 204 })
  async remove(
    @User() user: Identity,
    @Param("applicationId") id: string,
    @Param("paymentId") paymentId: string,
  ): Promise<void> {
    await this.payments.remove(user, id, paymentId)
  }
}
