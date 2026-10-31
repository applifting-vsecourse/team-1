import {
  FILTERABLE_PAYMENT_STATUSES,
  type FilterablePaymentStatus,
} from "@/modules/overview/domain/application-list"
import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator"

export class ApplicationListQueryDto {
  @ApiPropertyOptional({ description: "Name, e-mail or variable symbol", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string
  @ApiPropertyOptional() @IsOptional() @IsString() termId?: string
  @ApiPropertyOptional({ enum: ["CONFIRMED", "WAITLISTED", "CANCELLED"] })
  @IsOptional()
  @IsIn(["CONFIRMED", "WAITLISTED", "CANCELLED"])
  status?: "CONFIRMED" | "WAITLISTED" | "CANCELLED"
  @ApiPropertyOptional({ enum: ["FEMALE", "MALE"] })
  @IsOptional()
  @IsIn(["FEMALE", "MALE"])
  gender?: "FEMALE" | "MALE"
  @ApiPropertyOptional({ enum: FILTERABLE_PAYMENT_STATUSES })
  @IsOptional()
  @IsIn(FILTERABLE_PAYMENT_STATUSES)
  payment?: FilterablePaymentStatus
}
