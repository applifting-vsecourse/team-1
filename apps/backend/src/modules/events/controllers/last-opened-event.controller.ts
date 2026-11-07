import { LastOpenedEventResponseDto } from "@/modules/events/controllers/dto/last-opened-event.response.dto"
import { LastOpenedEventService } from "@/modules/events/services/last-opened-event.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, HttpCode, Param, Put } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("events")
@Auth("ORGANIZER")
@Controller("organizer")
@ApiResponse({ status: 401, description: "Session required" })
export class LastOpenedEventController {
  constructor(private readonly lastOpened: LastOpenedEventService) {}

  @Get("last-opened-event")
  @ApiOperation({ summary: "The event the organizer opened last, where login lands (US-51)" })
  @ApiResponse({ status: 200, type: LastOpenedEventResponseDto })
  async get(@User() user: Identity): Promise<LastOpenedEventResponseDto> {
    return { eventId: await this.lastOpened.get(user) }
  }

  @Put("events/:eventId/last-opened")
  @HttpCode(204)
  @ApiOperation({ summary: "Remember the event as the last opened one (US-51)" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: "Wrong account type, foreign or missing event" })
  async remember(@User() user: Identity, @Param("eventId") eventId: string): Promise<void> {
    await this.lastOpened.remember(user, eventId)
  }
}
