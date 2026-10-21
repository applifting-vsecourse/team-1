import { GENDERS } from "@/shared/domain/gender"
import type { Gender } from "@/shared/domain/gender"
import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"
import {
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator"

export class SubmitParticipantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
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
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitParticipantDto)
  participants!: SubmitParticipantDto[]
}
