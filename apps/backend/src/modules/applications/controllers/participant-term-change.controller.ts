import { ParticipantTermChangeRequestDto } from "@/modules/applications/controllers/dto/participant-term-change.dto"
import { ParticipantChangeOptions } from "@/modules/applications/domain/participant-term-change"
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
  Put,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("participants")
@Controller("participant/applications/:applicationId")
@Auth("PARTICIPANT")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ParticipantTermChangeController {
  constructor(private readonly statuses: TermStatusService) {}

  @Get("change-options")
  @ApiOperation({ summary: "Terms selectable by the application owner (US-113)" })
  @ApiResponse({ status: 200 })
  async options(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
  ): Promise<ParticipantChangeOptions> {
    return this.statuses.participantChangeOptions(user, applicationId)
  }

  @Put("terms")
  @HttpCode(204)
  @ApiOperation({
    summary:
      "Immediately change or cancel the participant's terms before cancellation starts (US-113)",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, description: "CANCELLATION_APPROVAL_REQUIRED from the start day" })
  async change(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Body() body: ParticipantTermChangeRequestDto,
  ): Promise<void> {
    await this.statuses.changeByParticipant(user, applicationId, body.termIds)
  }
}
