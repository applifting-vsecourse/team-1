import { BulkDecisionResult } from "@/modules/applications/services/bulk-decision.service"
import { ApiProperty } from "@nestjs/swagger"
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsString } from "class-validator"

export class BulkDecisionRequestDto {
  @ApiProperty({ enum: ["WAITLIST", "REJECT"], description: "Waitlist them, or reject them" })
  @IsIn(["WAITLIST", "REJECT"])
  decision!: "WAITLIST" | "REJECT"

  @ApiProperty({ type: [String], description: "Applications selected in the term" })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @IsString({ each: true })
  applicationIds!: string[]
}

export class BulkDecisionResponseDto {
  @ApiProperty({ type: [String], description: "In order of receipt" }) changed!: string[]
  @ApiProperty({
    type: [String],
    description: "Left as they were: not waiting for evaluation in the term, or not of the event",
  })
  unchanged!: string[]

  static fromDomain(result: BulkDecisionResult): BulkDecisionResponseDto {
    return { changed: result.changed, unchanged: result.unchanged }
  }
}
