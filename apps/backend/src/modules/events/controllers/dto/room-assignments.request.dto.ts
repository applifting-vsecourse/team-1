import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
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

class RoomAssignmentItemDto {
  @ApiProperty({ description: "Application in the term" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  applicationTermId!: string

  @ApiProperty({ description: "Room of this term" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  roomId!: string
}

export class RoomAssignmentsBulkRequestDto {
  @ApiProperty({ type: [RoomAssignmentItemDto], description: "A confirmed room proposal (US-147)" })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => RoomAssignmentItemDto)
  assignments!: RoomAssignmentItemDto[]
}
