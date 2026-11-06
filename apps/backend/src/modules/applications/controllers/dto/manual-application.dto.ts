import { GENDERS } from "@/shared/domain/gender"
import type { Gender } from "@/shared/domain/gender"
import { ApiProperty } from "@nestjs/swagger"
import { Transform, Type } from "class-transformer"
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator"

export class ManualTermChoiceDto {
  @ApiProperty()
  @IsString()
  termId!: string

  @ApiProperty({ enum: ["CONFIRMED", "WAITLISTED"] })
  @IsIn(["CONFIRMED", "WAITLISTED"])
  status!: "CONFIRMED" | "WAITLISTED"
}

export class ManualApplicationRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string

  @ApiProperty({ example: "2000-05-15" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate!: string

  @ApiProperty({ enum: GENDERS })
  @IsIn(GENDERS)
  gender!: Gender

  @ApiProperty()
  @IsEmail()
  email!: string

  @ApiProperty({ example: "+420 777 123 456" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().replace(/[ ()-]/g, "") : value,
  )
  @Matches(/^\+?[0-9]{7,30}$/)
  phone!: string

  @ApiProperty({ description: "The organizer confirms that the applicant has consented." })
  @Equals(true)
  consent!: true

  @ApiProperty({ type: [ManualTermChoiceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ManualTermChoiceDto)
  terms!: ManualTermChoiceDto[]

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  confirmOverCapacity?: boolean
}

export class ManualApplicationResponseDto {
  @ApiProperty()
  applicationId!: string

  @ApiProperty()
  number!: number
}
