import {
  BulkEvaluationPreview,
  BulkEvaluationResult,
  GenderBreakdown,
} from "@/modules/applications/services/bulk-evaluation.service"
import { ApiProperty } from "@nestjs/swagger"
import { Type } from "class-transformer"
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator"
import { GenderCapacityDto } from "./term-capacity.response.dto"

class ExpectedConfirmedDto {
  @ApiProperty() @IsInt() @Min(0) FEMALE!: number
  @ApiProperty() @IsInt() @Min(0) MALE!: number
}

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
      "How many applications of each gender the organizer saw confirmed in the preview; another number now means the capacity changed and nothing is evaluated (409 EVALUATION_PLAN_CHANGED)",
    type: ExpectedConfirmedDto,
  })
  @ValidateNested()
  @Type(() => ExpectedConfirmedDto)
  expectedConfirmed!: ExpectedConfirmedDto

  @ApiProperty({
    enum: ["WAITLIST", "REJECT"],
    required: false,
    description:
      "What happens to the applications that do not fit: put them on the waitlist, or reject them. Required when some do not fit (400 EVALUATION_REST_REQUIRED).",
  })
  @IsOptional()
  @IsIn(["WAITLIST", "REJECT"])
  rest?: "WAITLIST" | "REJECT"
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
  @ApiProperty({ type: GenderBreakdownDto, description: "Do not fit: the organizer chooses" })
  rest!: GenderBreakdownDto
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
      rest: dto(preview.rest),
      freePlaces: preview.freePlaces,
      isShared: preview.isShared,
    }
  }
}

export class BulkEvaluationResponseDto {
  @ApiProperty({ type: [String], description: "In order of receipt" }) confirmed!: string[]
  @ApiProperty({ type: [String], description: "In order of receipt" }) waitlisted!: string[]
  @ApiProperty({ type: [String], description: "Rejected (Zrušená), in order of receipt" })
  rejected!: string[]
  @ApiProperty({
    type: [String],
    description: "Left as they were: not waiting for evaluation in the term, or not of the event",
  })
  unchanged!: string[]

  static fromDomain(result: BulkEvaluationResult): BulkEvaluationResponseDto {
    return {
      confirmed: result.confirmed,
      waitlisted: result.waitlisted,
      rejected: result.rejected,
      unchanged: result.unchanged,
    }
  }
}
