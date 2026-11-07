import { Attention } from "@/modules/overview/domain/attention"
import { ApiProperty } from "@nestjs/swagger"

class AttentionDebtDto {
  @ApiProperty() debtorCount!: number
  @ApiProperty() overdueCount!: number
  @ApiProperty() totalDebtCzk!: number
}

export class AttentionResponseDto {
  @ApiProperty() toEvaluateCount!: number
  @ApiProperty({ type: AttentionDebtDto }) debt!: AttentionDebtDto
  @ApiProperty() changeRequestCount!: number

  static fromDomain(data: Attention): AttentionResponseDto {
    return { ...data }
  }
}
