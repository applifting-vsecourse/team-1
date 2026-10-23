import { RoomMode } from "@/modules/events/domain/rooms"
import { Gender } from "@/shared/domain/gender"
import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsIn, IsInt, IsString, MaxLength, Min, MinLength, ValidateIf } from "class-validator"

export class RoomRequestDto {
  @ApiProperty({ example: "12", maxLength: 100 })
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  capacity!: number

  @ApiProperty({ enum: ["FEMALE", "MALE"], nullable: true, required: false })
  @ValidateIf((_object, value: unknown) => value !== null && value !== undefined)
  @IsIn(["FEMALE", "MALE"])
  gender?: Gender | null
}

export class RoomModeRequestDto {
  @ApiProperty({ enum: ["GENDERED", "SHARED"] })
  @IsIn(["GENDERED", "SHARED"])
  roomMode!: RoomMode
}
