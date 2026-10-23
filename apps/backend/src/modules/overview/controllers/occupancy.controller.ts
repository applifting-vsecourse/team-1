import { OccupancyResponseDto } from "@/modules/overview/controllers/dto/occupancy.response.dto"
import { OccupancyService } from "@/modules/overview/services/occupancy.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, Param } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("overview")
@Auth("ORGANIZER")
@Controller("organizer/events/:eventId/occupancy")
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({ status: 403, description: "Wrong account type, foreign or missing event" })
export class OccupancyController {
  constructor(private readonly occupancy: OccupancyService) {}

  @Get()
  @ApiOperation({
    summary: "Capacity, confirmed, free places and waitlisted per term (US-29)",
  })
  @ApiResponse({ status: 200, type: OccupancyResponseDto })
  async get(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<OccupancyResponseDto> {
    return OccupancyResponseDto.fromDomain(await this.occupancy.get(user, eventId))
  }
}
