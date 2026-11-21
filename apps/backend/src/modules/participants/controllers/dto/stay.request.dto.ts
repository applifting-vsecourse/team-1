import { WALL_TIME_PATTERN } from "@/shared/domain/prague-wall-time"
import { ApiProperty } from "@nestjs/swagger"
import { IsString, Matches, ValidateIf } from "class-validator"

export class StayRequestDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: "2027-07-13T10:30",
    description: "Later arrival, Prague wall time `yyyy-MM-ddTHH:mm`; null for none.",
  })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(WALL_TIME_PATTERN)
  lateArrival!: string | null

  @ApiProperty({
    type: String,
    nullable: true,
    example: "2027-07-18T16:00",
    description: "Earlier departure, Prague wall time `yyyy-MM-ddTHH:mm`; null for none.",
  })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(WALL_TIME_PATTERN)
  earlyDeparture!: string | null
}
