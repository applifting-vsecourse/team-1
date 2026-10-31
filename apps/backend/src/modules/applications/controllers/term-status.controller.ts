import {
  ChangeTermStatusRequestDto,
  TermStatusResponseDto,
} from "@/modules/applications/controllers/dto/term-status.dto"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("applications")
@Controller("organizer/applications/:applicationId/terms")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class TermStatusController {
  constructor(private readonly statuses: TermStatusService) {}

  @Get()
  @ApiOperation({ summary: "Terms of an application with their status and the log of changes" })
  @ApiResponse({ status: 200, type: [TermStatusResponseDto] })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign application" })
  async get(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
  ): Promise<TermStatusResponseDto[]> {
    return (await this.statuses.getTerms(user, applicationId)).map((term) =>
      TermStatusResponseDto.fromDomain(term),
    )
  }

  @Patch(":termId/status")
  @HttpCode(204)
  @ApiOperation({ summary: "Change the status of an application in a term by hand (US-28)" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign application" })
  @ApiResponse({
    status: 409,
    description: "INVALID_STATUS_TRANSITION, or CAPACITY_EXCEEDED without confirmOverCapacity",
  })
  async change(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Param("termId") termId: string,
    @Body() body: ChangeTermStatusRequestDto,
  ): Promise<void> {
    await this.statuses.changeByOrganizer(
      user,
      applicationId,
      termId,
      body.status,
      body.confirmOverCapacity === true,
    )
  }
}
