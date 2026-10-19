import { PublicEventResponseDto } from "@/modules/applications/controllers/dto/public-event.response.dto"
import { PublicEventsService } from "@/modules/applications/services/public-events.service"
import { Controller, Get, Param } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

/** Public — no `@Auth`: applicants open the link without an account. */
@ApiTags("applications")
@Controller("public/events")
export class PublicEventsController {
  constructor(private readonly publicEvents: PublicEventsService) {}

  @Get(":publicToken")
  @ApiOperation({
    summary: "Event with its terms and prices for the application form",
  })
  @ApiResponse({ status: 200, type: PublicEventResponseDto })
  @ApiResponse({
    status: 404,
    description: "Unknown link, or the event has no term or no room yet (NOT_FOUND).",
  })
  async get(@Param("publicToken") publicToken: string): Promise<PublicEventResponseDto> {
    const event = await this.publicEvents.getByPublicToken(publicToken)
    return PublicEventResponseDto.fromDomain(event)
  }
}
