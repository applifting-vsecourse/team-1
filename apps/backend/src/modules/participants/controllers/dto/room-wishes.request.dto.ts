import { MAX_ROOM_WISH_LENGTH, MAX_ROOM_WISHES } from "@/shared/domain/room-wishes"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { ArrayMaxSize, IsArray, IsBoolean, IsString, MaxLength, ValidateIf } from "class-validator"

export class RoomWishesRequestDto {
  @ApiProperty({
    type: [String],
    maxItems: MAX_ROOM_WISHES,
    example: ["Eva Černá", "Klára Veselá"],
    description: "Names to room with, free text. An empty list deletes the wishes.",
  })
  @IsArray()
  @ArrayMaxSize(MAX_ROOM_WISHES)
  @IsString({ each: true })
  @MaxLength(MAX_ROOM_WISH_LENGTH, { each: true })
  names!: string[]

  @ApiPropertyOptional({
    description: "Mark the step done without naming roommates. Requires an empty list.",
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  noRoomWishes?: boolean
}
