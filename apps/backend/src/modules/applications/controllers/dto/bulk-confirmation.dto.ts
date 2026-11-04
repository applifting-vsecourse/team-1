import {
  BulkConfirmationPreview,
  BulkConfirmationResult,
} from "@/modules/applications/services/bulk-confirmation.service"
import { ApiProperty } from "@nestjs/swagger"
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsString } from "class-validator"
import { GenderCapacityDto } from "./term-capacity.response.dto"

export class BulkConfirmationRequestDto {
  @ApiProperty({ type: [String], description: "Applications selected in the term" })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @IsString({ each: true })
  applicationIds!: string[]
}

class BulkApplicationDto {
  @ApiProperty() applicationId!: string
  @ApiProperty() name!: string
}

export class BulkConfirmationPreviewResponseDto {
  @ApiProperty() selectedCount!: number
  @ApiProperty({ type: GenderCapacityDto }) freePlaces!: GenderCapacityDto
  @ApiProperty({ type: GenderCapacityDto, description: "Free beds after the confirmation" })
  freePlacesAfter!: GenderCapacityDto
  @ApiProperty({ description: "Shared rooms: one pool for both genders" }) isShared!: boolean
  @ApiProperty({ type: [BulkApplicationDto], description: "In order of receipt" })
  confirmable!: BulkApplicationDto[]
  @ApiProperty({ type: [BulkApplicationDto] }) skipped!: BulkApplicationDto[]

  static fromDomain(preview: BulkConfirmationPreview): BulkConfirmationPreviewResponseDto {
    const named = (ids: string[]): BulkApplicationDto[] =>
      ids.map((applicationId) => ({ applicationId, name: preview.names[applicationId] }))
    return {
      selectedCount: preview.selectedCount,
      freePlaces: preview.freePlaces,
      freePlacesAfter: preview.freePlacesAfter,
      isShared: preview.isShared,
      confirmable: named(preview.confirmable),
      skipped: named(preview.skipped),
    }
  }
}

export class BulkConfirmationResponseDto {
  @ApiProperty({ type: [String] }) confirmed!: string[]
  @ApiProperty({
    type: [String],
    description:
      "Left as they were: no free bed, not waiting in the term, or not an application of the event",
  })
  unchanged!: string[]

  static fromDomain(result: BulkConfirmationResult): BulkConfirmationResponseDto {
    return { confirmed: result.confirmed, unchanged: result.unchanged }
  }
}
