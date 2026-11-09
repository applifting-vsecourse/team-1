import { PublicTermDto } from "@/modules/applications/controllers/dto/public-event.response.dto"
import {
  Catalog,
  CatalogEvent,
  CatalogEventDetail,
} from "@/modules/applications/domain/public-catalog"
import { ApiProperty } from "@nestjs/swagger"

export class CatalogOrganizationDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ example: "Letní kemp z. s." })
  name!: string
}

export class CatalogEventTermDto {
  @ApiProperty({ type: String, nullable: true, example: "1. týden" })
  name!: string | null

  @ApiProperty({ example: "2027-07-04", description: "ISO date." })
  startsOn!: string

  @ApiProperty({ example: "2027-07-10", description: "ISO date." })
  endsOn!: string
}

export class CatalogEventDto {
  @ApiProperty({ description: "Token of the application link and of the event page." })
  publicToken!: string

  @ApiProperty({ example: "Letní kemp 2027" })
  name!: string

  @ApiProperty({ description: "The organization it is listed under (filter of the catalog)." })
  organizationId!: string

  @ApiProperty()
  organizationName!: string

  @ApiProperty({ type: String, nullable: true })
  location!: string | null

  @ApiProperty({ type: [CatalogEventTermDto], description: "Dates of every term, by start date." })
  terms!: CatalogEventTermDto[]

  @ApiProperty({ example: 2 })
  termCount!: number

  @ApiProperty({ type: Number, nullable: true, example: 4500, description: "Whole CZK." })
  fromPriceCzk!: number | null

  @ApiProperty({ description: "The application link works." })
  isOpenForApplications!: boolean

  @ApiProperty({ description: "A photo can be loaded from the photo endpoint." })
  hasPhoto!: boolean

  static fromDomain(event: CatalogEvent): CatalogEventDto {
    return {
      publicToken: event.publicToken,
      name: event.name,
      organizationId: event.organizationId,
      organizationName: event.organizationName,
      location: event.location,
      terms: event.terms.map(({ name, startsOn, endsOn }) => ({ name, startsOn, endsOn })),
      termCount: event.termCount,
      fromPriceCzk: event.fromPriceCzk,
      isOpenForApplications: event.isOpenForApplications,
      hasPhoto: event.hasPhoto,
    }
  }
}

export class CatalogResponseDto {
  @ApiProperty({
    type: [CatalogOrganizationDto],
    description: "Organizations with at least one published event.",
  })
  organizations!: CatalogOrganizationDto[]

  @ApiProperty({ type: [CatalogEventDto], description: "Ordered by start date." })
  events!: CatalogEventDto[]

  static fromDomain(catalog: Catalog): CatalogResponseDto {
    return {
      organizations: catalog.organizations.map(({ id, name }) => ({ id, name })),
      events: catalog.events.map((event) => CatalogEventDto.fromDomain(event)),
    }
  }
}

export class CatalogEventDetailResponseDto {
  @ApiProperty({ description: "Token of the application link." })
  publicToken!: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  organizationName!: string

  @ApiProperty({ type: String, nullable: true })
  description!: string | null

  @ApiProperty({ type: String, nullable: true })
  location!: string | null

  @ApiProperty({ type: String, nullable: true })
  contactEmail!: string | null

  @ApiProperty({ type: String, nullable: true })
  contactPhone!: string | null

  @ApiProperty({ type: [PublicTermDto], description: "Ordered by start date." })
  terms!: PublicTermDto[]

  @ApiProperty({ description: "A photo can be loaded from the photo endpoint." })
  hasPhoto!: boolean

  static fromDomain(event: CatalogEventDetail): CatalogEventDetailResponseDto {
    return {
      publicToken: event.publicToken,
      name: event.name,
      organizationName: event.organizationName,
      description: event.description,
      location: event.location,
      contactEmail: event.contactEmail,
      contactPhone: event.contactPhone,
      terms: event.terms.map((term) => PublicTermDto.fromDomain(term)),
      hasPhoto: event.hasPhoto,
    }
  }
}
