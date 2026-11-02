import { RoomMode } from "@/modules/events/domain/rooms"
import { Gender } from "@/shared/domain/gender"
import { ApiProperty } from "@nestjs/swagger"
import { Transform, Type } from "class-transformer"
import {
  IsArray,
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
}

export class RoomGenderDto {
  @ApiProperty()
  @IsString()
  id!: string

  @ApiProperty({ enum: ["FEMALE", "MALE"] })
  @IsIn(["FEMALE", "MALE"])
  gender!: Gender
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
