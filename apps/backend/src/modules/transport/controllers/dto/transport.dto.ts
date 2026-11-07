import {
  ApplicationTransport,
  EventTransport,
  TransportInput,
  TransportParticipants,
} from "@/modules/transport/domain/transport"
import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from "class-validator"

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value)

export class UpdateTransportRequestDto {
  @ApiProperty({ example: "Autobus z Prahy", maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string

  @ApiProperty({ example: "Praha, Černý Most · nástupiště 3", maxLength: 200 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  departurePlace!: string

  @ApiProperty({
    example: "2027-07-12T06:00:00.000Z",
    description: "ISO 8601 instant, no later than the last day of the term",
  })
  @IsDateString()
  departureAt!: string

  toInput(): TransportInput {
    return {
      name: this.name,
      departurePlace: this.departurePlace,
      departureAt: new Date(this.departureAt),
    }
  }
}

export class CreateTransportRequestDto extends UpdateTransportRequestDto {
  @ApiProperty({ description: "The term the transport goes to" })
  @IsString()
  @MinLength(1)
  termId!: string
}

export class ChooseTransportRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  termId!: string

  @ApiProperty({ nullable: true, description: "Transport id; null or `own` = own transport" })
  @IsOptional()
  @IsString()
  transportId?: string | null
}

export class TransportOptionDto {
  @ApiProperty() id!: string
  @ApiProperty() name!: string
  @ApiProperty() departurePlace!: string
  @ApiProperty({ type: String, format: "date-time" }) departureAt!: string
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
  @ApiProperty() ownCount!: number
}

export class EventTransportResponseDto {
  @ApiProperty() eventName!: string
  @ApiProperty({ nullable: true, type: String }) eventLocation!: string | null
  @ApiProperty({ type: [TermTransportDto] }) terms!: TermTransportDto[]

  static fromDomain(domain: EventTransport): EventTransportResponseDto {
    return {
      ...domain,
      terms: domain.terms.map((term) => ({
        ...term,
        transports: term.transports.map((item) => ({
          ...item,
          departureAt: item.departureAt.toISOString(),
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
  @ApiProperty({ nullable: true, type: String }) name!: string | null
  @ApiProperty({ type: [TransportParticipantDto] }) participants!: TransportParticipantDto[]
}

export class TermChoiceDto extends TermDto {
  @ApiProperty() status!: string
  @ApiProperty({ nullable: true, type: String }) selectedTransportId!: string | null
  @ApiProperty({ description: "The participant chose to get there on their own" })
  isOwn!: boolean
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
          departureAt: item.departureAt.toISOString(),
        })),
      })),
    }
  }
}
