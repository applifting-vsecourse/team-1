import { SavedApplication } from "@/modules/applications/domain/application-submission"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { ApiProperty } from "@nestjs/swagger"

export class SubmittedTermDto {
  @ApiProperty()
  termId!: string

  @ApiProperty({ enum: ["CONFIRMED", "WAITLISTED"] })
  status!: ApplicationTermStatus
}

export class SubmittedApplicationDto {
  @ApiProperty({ description: "Variable symbol." })
  number!: number

  @ApiProperty({ description: "Secret of the confirmation page." })
  accessToken!: string

  @ApiProperty({ type: [SubmittedTermDto] })
  terms!: SubmittedTermDto[]
}

export class SubmitApplicationResponseDto {
  @ApiProperty({ description: "Access token of the first participant's application." })
  accessToken!: string

  @ApiProperty({
    type: [SubmittedApplicationDto],
    description: "One per participant, in form order.",
  })
  applications!: SubmittedApplicationDto[]

  static fromDomain(saved: SavedApplication[]): SubmitApplicationResponseDto {
    return {
      accessToken: saved[0].accessToken,
      applications: saved.map((application) => ({
        number: application.number,
        accessToken: application.accessToken,
        terms: application.terms.map(({ termId, status }) => ({ termId, status })),
      })),
    }
  }
}
