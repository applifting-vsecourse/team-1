import { EvaluationMode } from "@/modules/applications/domain/evaluation-mode"
import { ApiProperty } from "@nestjs/swagger"
import { IsIn } from "class-validator"

export class EvaluationModeRequestDto {
  @ApiProperty({ enum: ["AUTOMATIC", "MANUAL"] })
  @IsIn(["AUTOMATIC", "MANUAL"])
  evaluationMode!: EvaluationMode
}
