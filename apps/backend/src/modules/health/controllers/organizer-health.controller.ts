import { HealthResponseDto } from "@/modules/health/controllers/dto/health.dto"
import { HealthService } from "@/modules/health/services/health.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, Param } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("health")
@Controller("organizer/applications/:applicationId/health")
@Auth("ORGANIZER")
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
}
