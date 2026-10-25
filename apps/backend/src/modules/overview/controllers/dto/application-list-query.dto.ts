import { ApiPropertyOptional } from "@nestjs/swagger"
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator"

export class ApplicationListQueryDto {
  @ApiPropertyOptional({ description: "Name, e-mail or variable symbol", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string
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
