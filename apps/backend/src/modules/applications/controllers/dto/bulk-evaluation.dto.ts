import {
  BulkEvaluationPreview,
  BulkEvaluationResult,
  GenderBreakdown,
} from "@/modules/applications/services/bulk-evaluation.service"
import { ApiProperty } from "@nestjs/swagger"
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  Min,
} from "class-validator"
import { GenderCapacityDto } from "./term-capacity.response.dto"

export class BulkEvaluationRequestDto {
  @ApiProperty({ type: [String], description: "Applications selected in the term" })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @IsString({ each: true })
  applicationIds!: string[]

  @ApiProperty({
    description:
      "How many applications the organizer saw confirmed in the preview; another number now means the capacity changed and nothing is evaluated (409 EVALUATION_PLAN_CHANGED)",
  })
  @IsInt()
  @Min(0)
  expectedConfirmedCount!: number
}

class GenderBreakdownDto {
  @ApiProperty() total!: number
  @ApiProperty({ type: GenderCapacityDto }) byGender!: GenderCapacityDto
}

export class BulkEvaluationPreviewResponseDto {
  @ApiProperty({ type: GenderBreakdownDto, description: "Still waiting for evaluation" })
  selected!: GenderBreakdownDto
  @ApiProperty({ type: GenderBreakdownDto, description: "Fit into the free beds" })
  confirm!: GenderBreakdownDto
  @ApiProperty({ type: GenderBreakdownDto, description: "Do not fit: become substitutes" })
  waitlist!: GenderBreakdownDto
  @ApiProperty({ type: GenderCapacityDto }) freePlaces!: GenderCapacityDto
  @ApiProperty({ description: "Shared rooms: one pool for both genders" }) isShared!: boolean

  static fromDomain(preview: BulkEvaluationPreview): BulkEvaluationPreviewResponseDto {
    const dto = (value: GenderBreakdown): GenderBreakdownDto => ({
      total: value.total,
      byGender: value.byGender,
    })
    return {
      selected: dto(preview.selected),
      confirm: dto(preview.confirm),
      waitlist: dto(preview.waitlist),
      freePlaces: preview.freePlaces,
      isShared: preview.isShared,
    }
  }
}

export class BulkEvaluationResponseDto {
  @ApiProperty({ type: [String], description: "In order of receipt" }) confirmed!: string[]
  @ApiProperty({ type: [String], description: "In order of receipt" }) waitlisted!: string[]
  @ApiProperty({
    type: [String],
    description: "Left as they were: not waiting for evaluation in the term, or not of the event",
  })
  unchanged!: string[]

  static fromDomain(result: BulkEvaluationResult): BulkEvaluationResponseDto {
    return {
      confirmed: result.confirmed,
      waitlisted: result.waitlisted,
      unchanged: result.unchanged,
    }
  }
}
