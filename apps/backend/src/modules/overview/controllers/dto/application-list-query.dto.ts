import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsIn, IsOptional, IsString } from "class-validator"

export class ApplicationListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() termId?: string
  @ApiPropertyOptional({ enum: ["CONFIRMED", "WAITLISTED"] })
  @IsOptional()
  @IsIn(["CONFIRMED", "WAITLISTED"])
  status?: "CONFIRMED" | "WAITLISTED"
  @ApiPropertyOptional({ enum: ["FEMALE", "MALE"] })
  @IsOptional()
  @IsIn(["FEMALE", "MALE"])
  gender?: "FEMALE" | "MALE"
  @ApiPropertyOptional({ enum: ["true", "false"] }) @IsOptional() @IsIn(["true", "false"]) paid?:
    "true" | "false"
}
