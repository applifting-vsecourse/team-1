import {
  FILTERABLE_PAYMENT_STATUSES,
  WAITLIST_FILTERS,
  type FilterablePaymentStatus,
  type WaitlistFilter,
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
  @ApiPropertyOptional({
    enum: ["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED", "ARCHIVED"],
  })
  @IsOptional()
  @IsIn(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED", "ARCHIVED"])
  status?: "TO_EVALUATE" | "CONFIRMED" | "WAITLISTED" | "CANCELLED" | "ARCHIVED"
  @ApiPropertyOptional({ enum: ["FEMALE", "MALE"] })
  @IsOptional()
  @IsIn(["FEMALE", "MALE"])
  gender?: "FEMALE" | "MALE"
  @ApiPropertyOptional({ enum: FILTERABLE_PAYMENT_STATUSES })
  @IsOptional()
  @IsIn(FILTERABLE_PAYMENT_STATUSES)
  payment?: FilterablePaymentStatus
  @ApiPropertyOptional({
    enum: WAITLIST_FILTERS,
    description: "FREE_BED: waitlisted with a free bed in a manually evaluated term",
  })
  @IsOptional()
  @IsIn(WAITLIST_FILTERS)
  waitlist?: WaitlistFilter
}
