import {
  EventOccupancy,
  OccupancyFigures,
  TermOccupancy,
} from "@/modules/overview/domain/occupancy"
import { ApiProperty } from "@nestjs/swagger"

class OccupancyFiguresDto implements OccupancyFigures {
  @ApiProperty({ description: "Beds" }) capacity!: number
  @ApiProperty() confirmed!: number
  @ApiProperty({ description: "Capacity minus confirmed; negative when overbooked." })
  free!: number
  @ApiProperty() waitlisted!: number
}

class GenderOccupancyDto {
  @ApiProperty({ type: OccupancyFiguresDto }) FEMALE!: OccupancyFiguresDto
  @ApiProperty({ type: OccupancyFiguresDto }) MALE!: OccupancyFiguresDto
}

class TermOccupancyDto extends OccupancyFiguresDto {
  @ApiProperty() id!: string
  @ApiProperty() name!: string
  @ApiProperty({ example: "2027-07-12" }) startsOn!: string
  @ApiProperty({ example: "2027-07-18" }) endsOn!: string
  @ApiProperty({
    type: GenderOccupancyDto,
    nullable: true,
    description: "Per gender in gendered rooms, null with shared rooms.",
  })
  byGender!: GenderOccupancyDto | null

  static fromDomain(term: TermOccupancy): TermOccupancyDto {
    return Object.assign(new TermOccupancyDto(), term)
  }
}

export class OccupancyResponseDto {
  @ApiProperty() eventId!: string
  @ApiProperty({ enum: ["GENDERED", "SHARED"] }) roomMode!: "GENDERED" | "SHARED"
  @ApiProperty() roomCount!: number
  @ApiProperty({ type: [TermOccupancyDto], description: "Active terms sorted by date." })
  terms!: TermOccupancyDto[]

  static fromDomain(occupancy: EventOccupancy): OccupancyResponseDto {
    return Object.assign(new OccupancyResponseDto(), {
      ...occupancy,
      terms: occupancy.terms.map((term) => TermOccupancyDto.fromDomain(term)),
    })
  }
}
