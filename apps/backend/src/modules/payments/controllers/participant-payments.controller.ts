import { SimulatePaymentRequestDto } from "@/modules/payments/controllers/dto/simulate-payment.request.dto"
import { PaymentsService } from "@/modules/payments/services/payments.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, HttpCode, Param, Post, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("payments")
@Controller("participant/applications/:applicationId/payments")
@Auth("PARTICIPANT")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ParticipantPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("simulation")
  @HttpCode(204)
  @ApiOperation({
    summary:
      "Staging and demo only (US-115): record a simulated payment of the remaining debt of one term",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: "Payment simulation is switched off (production)" })
  async simulate(
    @User() user: Identity,
    @Param("applicationId") id: string,
    @Body() body: SimulatePaymentRequestDto,
  ): Promise<void> {
    await this.payments.simulate(user, id, body.termId)
  }
}
