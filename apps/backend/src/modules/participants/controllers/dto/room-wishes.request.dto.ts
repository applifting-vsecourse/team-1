import { MAX_ROOM_WISH_LENGTH, MAX_ROOM_WISHES } from "@/shared/domain/room-wishes"
import { ApiProperty } from "@nestjs/swagger"
import { ArrayMaxSize, IsArray, IsString, MaxLength } from "class-validator"

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
}
