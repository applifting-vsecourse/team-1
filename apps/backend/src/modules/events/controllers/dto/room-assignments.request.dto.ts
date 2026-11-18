import { ApiProperty } from "@nestjs/swagger"
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator"

export class RoomAssignmentRequestDto {
  @ApiProperty({ description: "Room of this term the participant goes to" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  roomId!: string

  @ApiProperty({
    required: false,
    type: [String],
    description:
      "Other terms of the same application where the room of the same name gets the participant too, all or nothing",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(999)
  @IsString({ each: true })
  alsoTermIds?: string[]

  @ApiProperty({
    required: false,
    description:
      "Knowingly confirmed: a full room gets one extra bed for the participant (in every room of alsoTermIds too) instead of a 409",
  })
  @IsOptional()
  @IsBoolean()
  confirmExtraBed?: boolean
}
