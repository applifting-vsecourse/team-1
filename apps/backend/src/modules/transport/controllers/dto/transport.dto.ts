import {
  ApplicationTransport,
  EventTransport,
  TransportInput,
  TransportKind,
  TransportParticipants,
} from "@/modules/transport/domain/transport"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator"

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value)

export class UpdateTransportRequestDto {
  @ApiPropertyOptional({
    example: "Autobus z Prahy",
    maxLength: 100,
    description: "Required for a ride; ignored for own transport",
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional({
    example: "Praha, Černý Most · nástupiště 3",
    maxLength: 200,
    description: "Required for a ride; ignored for own transport",
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  departurePlace?: string

  @ApiPropertyOptional({
    example: "2027-07-12T06:00:00.000Z",
    description:
      "ISO 8601 instant, no later than the last day of the term; required for a ride, ignored for own transport",
  })
  @IsOptional()
  @IsDateString()
  departureAt?: string

  @ApiPropertyOptional({
    example: "Parkoviště za bránou, vjezd z hlavní silnice.",
    maxLength: 2000,
    description: "Free text for the participant: address, where to park, what to bring",
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  instructions?: string

  toInput(): Partial<TransportInput> {
    return {
      name: this.name,
      departurePlace: this.departurePlace,
      departureAt: this.departureAt ? new Date(this.departureAt) : undefined,
      instructions: this.instructions ?? null,
    }
  }
}

export class CreateTransportRequestDto extends UpdateTransportRequestDto {
  @ApiProperty({ description: "The term the transport goes to" })
  @IsString()
  @MinLength(1)
  termId!: string

  @ApiProperty({ enum: ["SCHEDULED", "OWN"], description: "Own transport: at most one per term" })
  @IsIn(["SCHEDULED", "OWN"])
  kind!: TransportKind
}

export class ChooseTransportRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  termId!: string

  @ApiProperty({ description: "Id of one of the transport offered in the term" })
  @IsString()
  @MinLength(1)
  transportId!: string
}

export class TransportOptionDto {
  @ApiProperty() id!: string
  @ApiProperty({ enum: ["SCHEDULED", "OWN"] }) kind!: TransportKind
  @ApiProperty({ description: "Empty for own transport" }) name!: string
  @ApiProperty({ nullable: true, type: String }) departurePlace!: string | null
  @ApiProperty({ nullable: true, type: String, format: "date-time" }) departureAt!: string | null
  @ApiProperty({ nullable: true, type: String }) instructions!: string | null
}

export class TransportSummaryDto extends TransportOptionDto {
  @ApiProperty() participantsCount!: number
}

class TermDto {
  @ApiProperty() termId!: string
  @ApiProperty({ nullable: true, type: String }) termName!: string | null
  @ApiProperty({ example: "2027-07-12" }) startsOn!: string
  @ApiProperty({ example: "2027-07-18" }) endsOn!: string
}

export class TermTransportDto extends TermDto {
  @ApiProperty({ type: [TransportSummaryDto] }) transports!: TransportSummaryDto[]
}

export class EventTransportResponseDto {
  @ApiProperty() eventName!: string
  @ApiProperty({ type: [TermTransportDto] }) terms!: TermTransportDto[]

  static fromDomain(domain: EventTransport): EventTransportResponseDto {
    return {
      ...domain,
      terms: domain.terms.map((term) => ({
        ...term,
        transports: term.transports.map((item) => ({
          ...item,
          departureAt: item.departureAt?.toISOString() ?? null,
        })),
      })),
    }
  }
}

export class TransportParticipantDto {
  @ApiProperty() applicationId!: string
  @ApiProperty() name!: string
  @ApiProperty() email!: string
}

export class TransportParticipantsResponseDto extends TermDto implements TransportParticipants {
  @ApiProperty({ description: "Empty for own transport" }) name!: string
  @ApiProperty({ enum: ["SCHEDULED", "OWN"] }) kind!: TransportKind
  @ApiProperty({ type: [TransportParticipantDto] }) participants!: TransportParticipantDto[]
}

export class TermChoiceDto extends TermDto {
  @ApiProperty() status!: string
  @ApiProperty({ nullable: true, type: String }) selectedTransportId!: string | null
  @ApiProperty({ type: [TransportOptionDto] }) options!: TransportOptionDto[]
}

export class ApplicationTransportResponseDto {
  @ApiProperty() participantName!: string
  @ApiProperty() eventName!: string
  @ApiProperty({ type: [TermChoiceDto] }) terms!: TermChoiceDto[]

  static fromDomain(domain: ApplicationTransport): ApplicationTransportResponseDto {
    return {
      ...domain,
      terms: domain.terms.map((term) => ({
        ...term,
        options: term.options.map((item) => ({
          ...item,
          departureAt: item.departureAt?.toISOString() ?? null,
        })),
      })),
    }
  }
}
