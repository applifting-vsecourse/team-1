import { CreateEventDto } from "@/modules/events/controllers/dto/create-event.dto"
import { OrganizerEventResponseDto } from "@/modules/events/controllers/dto/organizer-event.response.dto"
import { EventsService } from "@/modules/events/services/events.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("events")
@Controller("organizer/events")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class OrganizerEventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @ApiOperation({ summary: "Create an event (US-12)" })
  @ApiResponse({ status: 201, type: OrganizerEventResponseDto })
  @ApiResponse({ status: 400, description: "Missing name or ambiguous organization." })
  @ApiResponse({ status: 403, description: "Not a member of the organization." })
  async create(
    @User() user: Identity,
    @Body() dto: CreateEventDto,
  ): Promise<OrganizerEventResponseDto> {
    return OrganizerEventResponseDto.fromDomain(await this.events.create(user, dto))
  }

  @Get()
  @ApiOperation({ summary: "Events of the organizer's organizations, newest first" })
  @ApiResponse({ status: 200, type: [OrganizerEventResponseDto] })
  async list(@User() user: Identity): Promise<OrganizerEventResponseDto[]> {
    const events = await this.events.list(user)
    return events.map((event) => OrganizerEventResponseDto.fromDomain(event))
  }

  @Get(":eventId")
  @ApiOperation({ summary: "One event with what is missing before its application link works" })
  @ApiResponse({ status: 200, type: OrganizerEventResponseDto })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  async get(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<OrganizerEventResponseDto> {
    return OrganizerEventResponseDto.fromDomain(await this.events.get(user, eventId))
  }
}
