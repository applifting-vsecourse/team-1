import {
  ApplicationProgram,
  EventProgram,
  ProgramInput,
  TermInfo,
} from "@/modules/program/domain/program"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsOptional, IsString, MaxLength } from "class-validator"

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value)

/** Everything is checked in the domain (`normalizeInput`), so a missing field is VALIDATION_FAILED. */
export class ProgramBlockRequestDto {
  @ApiProperty({ example: "2027-07-13", description: "A day of the term" })
  @IsOptional()
  @IsString()
  date?: string

  @ApiProperty({ example: "10:00", description: "HH:mm" })
  @IsOptional()
  @IsString()
  startTime?: string

  @ApiProperty({ example: "12:00", description: "HH:mm, after startTime" })
  @IsOptional()
  @IsString()
  endTime?: string

  @ApiProperty({ example: "Dílny", maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional({ example: "Chata A–C", maxLength: 200 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  place?: string

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  description?: string

  toInput(): Partial<ProgramInput> {
    return {
      date: this.date,
      startTime: this.startTime,
      endTime: this.endTime,
      name: this.name,
      place: this.place ?? null,
      description: this.description ?? null,
    }
  }
}

export class ProgramBlockDto {
  @ApiProperty() id!: string
  @ApiProperty({ example: "2027-07-13" }) date!: string
  @ApiProperty({ example: "10:00" }) startTime!: string
  @ApiProperty({ example: "12:00" }) endTime!: string
  @ApiProperty() name!: string
  @ApiProperty({ nullable: true, type: String }) place!: string | null
  @ApiProperty({ nullable: true, type: String }) description!: string | null
}

export class TermProgramDto implements TermInfo {
  @ApiProperty() termId!: string
  @ApiProperty({ nullable: true, type: String }) termName!: string | null
  @ApiProperty({ example: "2027-07-12" }) startsOn!: string
  @ApiProperty({ example: "2027-07-18" }) endsOn!: string
  @ApiProperty({ type: [ProgramBlockDto], description: "By day, then by time" })
  blocks!: ProgramBlockDto[]
}

export class EventProgramResponseDto implements EventProgram {
  @ApiProperty() eventName!: string
  @ApiProperty({ type: [TermProgramDto] }) terms!: TermProgramDto[]
}

export class ApplicationProgramResponseDto implements ApplicationProgram {
  @ApiProperty() participantName!: string
  @ApiProperty() eventName!: string
  @ApiProperty({
    type: [TermProgramDto],
    description: "Only the terms the participant is confirmed in",
  })
  terms!: TermProgramDto[]
}
