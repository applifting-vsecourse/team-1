import { CreateEventDto } from "@/modules/events/controllers/dto/create-event.dto"
import { EvaluationModeRequestDto } from "@/modules/events/controllers/dto/evaluation-mode.request.dto"
import { OrganizerEventResponseDto } from "@/modules/events/controllers/dto/organizer-event.response.dto"
import { EventsService } from "@/modules/events/services/events.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
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

  @Patch(":eventId/evaluation-mode")
  @ApiOperation({
    summary: "Choose automatic or manual evaluation; only before applications open (US-101)",
  })
  @ApiResponse({ status: 200, type: OrganizerEventResponseDto })
  @ApiResponse({ status: 400, description: "Invalid evaluation mode." })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  @ApiResponse({ status: 409, description: "Applications are open (EVALUATION_MODE_LOCKED)." })
  async setEvaluationMode(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Body() body: EvaluationModeRequestDto,
  ): Promise<OrganizerEventResponseDto> {
    return OrganizerEventResponseDto.fromDomain(
      await this.events.setEvaluationMode(user, eventId, body.evaluationMode),
    )
  }

  @Delete(":eventId")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete an event nobody has applied to, with its terms and rooms" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  @ApiResponse({ status: 409, description: "The event has applications (EVENT_HAS_APPLICATIONS)." })
  async remove(@User() user: Identity, @Param("eventId") eventId: string): Promise<void> {
    await this.events.delete(user, eventId)
  }
}
