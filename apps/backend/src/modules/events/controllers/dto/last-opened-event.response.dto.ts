import { ApiProperty } from "@nestjs/swagger"

export class LastOpenedEventResponseDto {
  @ApiProperty({ type: String, nullable: true }) eventId!: string | null
}
