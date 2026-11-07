import {
  HealthResponseDto,
  SaveHealthRequestDto,
} from "@/modules/health/controllers/dto/health.dto"
import { HealthService } from "@/modules/health/services/health.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, Get, Param, Put, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("health")
@Controller("participant/applications/:applicationId/health")
@Auth("PARTICIPANT")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ParticipantHealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Own health restriction of the participant of an application (US-68)" })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  @ApiResponse({ status: 403, description: "Not the participant's own application" })
  async get(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
  ): Promise<HealthResponseDto> {
    return HealthResponseDto.fromDomain(await this.health.getOwn(user, applicationId))
  }

  @Put()
  @ApiOperation({ summary: "Save the health restriction with the explicit consent (US-68)" })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  @ApiResponse({ status: 400, description: "HEALTH_CONSENT_REQUIRED or invalid input" })
  @ApiResponse({ status: 403, description: "Not the participant's own application" })
  async save(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Body() body: SaveHealthRequestDto,
  ): Promise<HealthResponseDto> {
    return HealthResponseDto.fromDomain(await this.health.saveOwn(user, applicationId, body))
  }
}
