import { ApiProperty } from "@nestjs/swagger"
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator"

export const ROOM_WARNING_NOTE_MAX_LENGTH = 500

export class AcknowledgeRoomWarningRequestDto {
  @ApiProperty({ enum: ["OVERCROWDED", "MIXED_GENDER", "CONFIRMED_WITHOUT_BED"] })
  @IsIn(["OVERCROWDED", "MIXED_GENDER", "CONFIRMED_WITHOUT_BED"])
  kind!: "OVERCROWDED" | "MIXED_GENDER" | "CONFIRMED_WITHOUT_BED"

  @ApiProperty({ required: false, description: "Room of an OVERCROWDED or MIXED_GENDER warning" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  roomId?: string

  @ApiProperty({ required: false, description: "Application of a CONFIRMED_WITHOUT_BED warning" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  applicationTermId?: string

  @ApiProperty({
    required: false,
    maxLength: ROOM_WARNING_NOTE_MAX_LENGTH,
    description: "Why the warning is fine; only organizers of the event see it",
  })
  @IsOptional()
  @IsString()
  @MaxLength(ROOM_WARNING_NOTE_MAX_LENGTH)
  note?: string
}
