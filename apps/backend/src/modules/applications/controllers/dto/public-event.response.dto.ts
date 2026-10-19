import {
  PublicEvent,
  PublicTerm,
} from '@/modules/applications/domain/public-event';
import { ApiProperty } from '@nestjs/swagger';

export class PublicTermDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: '1. týden' })
  name!: string;

  @ApiProperty({ example: '2027-07-04', description: 'ISO date.' })
  startsOn!: string;

  @ApiProperty({ example: '2027-07-10', description: 'ISO date.' })
  endsOn!: string;

  @ApiProperty({ example: 4500, description: 'Whole CZK.' })
  priceCzk!: number;

  static fromDomain(term: PublicTerm): PublicTermDto {
    return {
      id: term.id,
      name: term.name,
      startsOn: term.startsOn,
      endsOn: term.endsOn,
      priceCzk: term.priceCzk,
    };
  }
}

export class PublicEventResponseDto {
  @ApiProperty({ example: 'Letní kemp 2027' })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  location!: string | null;

  @ApiProperty({ type: [PublicTermDto], description: 'Ordered by start date.' })
  terms!: PublicTermDto[];

  static fromDomain(event: PublicEvent): PublicEventResponseDto {
    return {
      name: event.name,
      description: event.description,
      location: event.location,
      terms: event.terms.map((term) => PublicTermDto.fromDomain(term)),
    };
  }
}
