import { IndividualRequestsResponseDto } from "@/modules/events/controllers/dto/individual-requests.response.dto"
import { IndividualRequestsService } from "@/modules/events/services/individual-requests.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, Param } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("individual requests")
@Auth("ORGANIZER")
@Controller("organizer/events/:eventId/terms/:termId/individual-requests")
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({ status: 403, description: "Wrong account type, foreign or missing record" })
export class IndividualRequestsController {
  constructor(private readonly requests: IndividualRequestsService) {}

  @Get()
  @ApiOperation({
    summary:
      "Applicants of the term who asked for individual accommodation, with what they wrote (#514)",
  })
  @ApiResponse({ status: 200, type: IndividualRequestsResponseDto })
  async list(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
  ): Promise<IndividualRequestsResponseDto> {
    return IndividualRequestsResponseDto.fromDomain(await this.requests.list(user, eventId, termId))
  }
}
