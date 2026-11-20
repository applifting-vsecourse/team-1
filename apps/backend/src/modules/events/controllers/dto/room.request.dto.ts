import {
  BULK_ROOMS_MAX_COUNT,
  BULK_ROOMS_MAX_FIRST_NUMBER,
} from "@/modules/events/domain/bulk-rooms"
import { RoomCopyStrategy, RoomMode } from "@/modules/events/domain/rooms"
import { Gender } from "@/shared/domain/gender"
import { ApiProperty } from "@nestjs/swagger"
import { Transform, Type } from "class-transformer"
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator"

export class RoomRequestDto {
  @ApiProperty({ example: "12", maxLength: 100 })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string

  // No product limit (docs/PROJEKT.md); the maximum is what the Int column holds.
  @ApiProperty({ minimum: 1, maximum: 2147483647 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  capacity!: number

  @ApiProperty({ enum: ["FEMALE", "MALE"], nullable: true, required: false })
  @ValidateIf((_object, value: unknown) => value !== null && value !== undefined)
  @IsIn(["FEMALE", "MALE"])
  gender?: Gender | null

  @ApiProperty({
    required: false,
    default: false,
    description:
      "Individual (mixed, family) room of a gendered term (US-145): no gender, outside the capacity, no mixed-gender warning",
  })
  @IsOptional()
  @IsBoolean()
  individual?: boolean
}

export class RoomExtraBedsRequestDto {
  // Any number of extra beds, each one more bed; no upper limit besides the Int column.
  @ApiProperty({ minimum: 0, maximum: 2147483647 })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  extraBeds!: number
}

export class RoomGenderDto {
  @ApiProperty()
  @IsString()
  id!: string

  @ApiProperty({ enum: ["FEMALE", "MALE"] })
  @IsIn(["FEMALE", "MALE"])
  gender!: Gender
}

export class RoomsPublishedRequestDto {
  @ApiProperty({
    description: "true publishes the room assignment of the term, false takes it back",
  })
  @IsBoolean()
  published!: boolean
}

export class RoomModeRequestDto {
  @ApiProperty({ enum: ["GENDERED", "SHARED"] })
  @IsIn(["GENDERED", "SHARED"])
  roomMode!: RoomMode

  @ApiProperty({
    type: [RoomGenderDto],
    required: false,
    description: "Gender of every existing room when switching to gendered rooms",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomGenderDto)
  rooms?: RoomGenderDto[]
}

export class RoomCopyRequestDto {
  @ApiProperty({ description: "Term of the same event to copy the rooms from" })
  @IsString()
  @MinLength(1)
  sourceTermId!: string

  @ApiProperty({
    enum: ["ADD", "REPLACE"],
    description: "Keep the rooms the term already has and add the copies, or replace them",
  })
  @IsIn(["ADD", "REPLACE"])
  strategy!: RoomCopyStrategy
}

export class RoomsBulkRequestDto {
  @ApiProperty({
    minimum: 1,
    maximum: BULK_ROOMS_MAX_COUNT,
    required: false,
    description: "Shared room mode: how many rooms to create",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(BULK_ROOMS_MAX_COUNT)
  count?: number

  @ApiProperty({
    minimum: 0,
    maximum: BULK_ROOMS_MAX_COUNT,
    required: false,
    description:
      "Gendered room mode: how many women's rooms. countFemale + countMale is 1 to 200 in sum",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(BULK_ROOMS_MAX_COUNT)
  countFemale?: number

  @ApiProperty({
    minimum: 0,
    maximum: BULK_ROOMS_MAX_COUNT,
    required: false,
    description: "Gendered room mode: how many men's rooms",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(BULK_ROOMS_MAX_COUNT)
  countMale?: number

  @ApiProperty({
    minimum: 1,
    maximum: 2147483647,
    description: "Beds (capacity) of every created room",
  })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  capacity!: number

  @ApiProperty({
    minimum: 1,
    maximum: BULK_ROOMS_MAX_FIRST_NUMBER,
    example: 101,
    description:
      "Number of the first room; the others follow one by one (women's rooms first), the name is the number",
  })
  @IsInt()
  @Min(1)
  @Max(BULK_ROOMS_MAX_FIRST_NUMBER)
  firstNumber!: number
}

export class RoomsBulkResponseDto {
  @ApiProperty({ type: [String], example: ["101", "102"] })
  created!: string[]

  @ApiProperty({
    type: [String],
    example: ["103"],
    description: "Numbers skipped because the term already has a room with that name",
  })
  skipped!: string[]
}
