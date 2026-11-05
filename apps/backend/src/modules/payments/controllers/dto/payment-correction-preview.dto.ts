import { CorrectPaymentRequestDto } from "@/modules/payments/controllers/dto/correct-payment.request.dto"
import { ApiProperty, PickType } from "@nestjs/swagger"

export class PaymentCorrectionPreviewRequestDto extends PickType(CorrectPaymentRequestDto, [
  "amountCzk",
  "termId",
] as const) {}

class TermCorrectionPreviewDto {
  @ApiProperty() termId!: string
  @ApiProperty() owedCzk!: number
  @ApiProperty() changeCzk!: number
}

export class PaymentCorrectionPreviewResponseDto {
  @ApiProperty() amountOwedCzk!: number
  @ApiProperty({ type: [TermCorrectionPreviewDto] }) terms!: TermCorrectionPreviewDto[]
}
