import {
  HealthResponseDto,
  SaveOrganizerHealthRequestDto,
} from "@/modules/health/controllers/dto/health.dto"
import { HealthService } from "@/modules/health/services/health.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, Get, Param, Put, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("health")
@Controller("organizer/applications/:applicationId/health")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class OrganizerHealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Health restriction of a participant — organizers only (US-68)" })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  @ApiResponse({ status: 403, description: "Application of another organization" })
  async get(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
  ): Promise<HealthResponseDto> {
    return HealthResponseDto.fromDomain(await this.health.getForOrganizer(user, applicationId))
  }

  @Put()
  @ApiOperation({
    summary:
      "Write the first health restriction (or confirm none) for the participant after confirming the applicant's consent (#789)",
  })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  @ApiResponse({
    status: 400,
    description: "HEALTH_ORGANIZER_CONSENT_REQUIRED or VALIDATION_FAILED",
  })
  @ApiResponse({ status: 403, description: "Application of another organization" })
  @ApiResponse({
    status: 409,
    description: "HEALTH_CHANGE_REQUEST_REQUIRED: a note is stored, changes go through a request",
  })
  async save(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Body() body: SaveOrganizerHealthRequestDto,
  ): Promise<HealthResponseDto> {
    return HealthResponseDto.fromDomain(
      await this.health.saveByOrganizer(user, applicationId, body),
    )
  }
}
