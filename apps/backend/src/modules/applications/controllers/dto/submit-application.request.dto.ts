import { GENDERS } from "@/shared/domain/gender"
import type { Gender } from "@/shared/domain/gender"
import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator"

/** Bounds of one public submission, so one anonymous request can't take every bed. */
export const MAX_PARTICIPANTS = 10
export const MAX_NAME_LENGTH = 100

export class SubmitParticipantDto {
  @ApiProperty({ maxLength: MAX_NAME_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME_LENGTH)
  firstName!: string

  @ApiProperty({ maxLength: MAX_NAME_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME_LENGTH)
  lastName!: string

  @ApiProperty({ example: "2014-05-18", description: "ISO date." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate!: string

  @ApiProperty({ enum: GENDERS })
  @IsIn(GENDERS)
  gender!: Gender

  @ApiProperty({ type: [String], description: "Ids of the terms of the event." })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  termIds!: string[]
}

export class SubmitApplicationRequestDto {
  @ApiProperty({ example: "rodic@example.com" })
  @IsEmail()
  email!: string

  @ApiProperty({ description: "Must be true." })
  @Equals(true)
  consent!: boolean

  @ApiProperty({
    type: [SubmitParticipantDto],
    description: "One application is stored per participant.",
    maxItems: MAX_PARTICIPANTS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PARTICIPANTS)
  @ValidateNested({ each: true })
  @Type(() => SubmitParticipantDto)
  participants!: SubmitParticipantDto[]
}
