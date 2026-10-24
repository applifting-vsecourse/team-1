import { SubmissionStatusResponseDto } from "@/modules/applications/controllers/dto/submission-status.response.dto"
import { SubmissionStatusService } from "@/modules/applications/services/submission-status.service"
import { Controller, Get, Param } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

/** Public — no `@Auth`: the secret access token is the credential (docs/PROJEKT.md §10). */
@ApiTags("applications")
@Controller("public/applications")
export class SubmissionStatusController {
  constructor(private readonly status: SubmissionStatusService) {}

  @Get(":accessToken")
  @ApiOperation({
    summary: "Status of a submission and what to pay, for the page after sending (US-25)",
  })
  @ApiResponse({ status: 200, type: SubmissionStatusResponseDto })
  @ApiResponse({ status: 404, description: "Unknown access token (NOT_FOUND)." })
  async get(@Param("accessToken") accessToken: string): Promise<SubmissionStatusResponseDto> {
    return SubmissionStatusResponseDto.fromDomain(await this.status.get(accessToken))
  }
}
