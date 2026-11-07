import {
  CreateTransportRequestDto,
  EventTransportResponseDto,
  TransportParticipantsResponseDto,
  UpdateTransportRequestDto,
} from "@/modules/transport/controllers/dto/transport.dto"
import { TransportService } from "@/modules/transport/services/transport.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("transport")
@Auth("ORGANIZER")
@Controller("organizer/events/:eventId/transport")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({ status: 403, description: "Wrong account type, foreign or missing record" })
export class OrganizerTransportController {
  constructor(private readonly transport: TransportService) {}

  @Get()
  @ApiOperation({ summary: "Transport of the event with the number of participants (US-65)" })
  @ApiResponse({ status: 200, type: EventTransportResponseDto })
  async list(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<EventTransportResponseDto> {
    return EventTransportResponseDto.fromDomain(await this.transport.list(user, eventId))
  }

  @Post()
  @HttpCode(204)
  @ApiOperation({ summary: "Add a way of transport to a term: name, place and time of departure" })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description: "Invalid name, place or time, or a departure after the term ends",
  })
  async create(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Body() body: CreateTransportRequestDto,
  ): Promise<void> {
    await this.transport.create(user, eventId, body.termId, body.toInput())
  }

  @Put(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Edit a way of transport" })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description: "Invalid name, place or time, or a departure after the term ends",
  })
  async update(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("id") id: string,
    @Body() body: UpdateTransportRequestDto,
  ): Promise<void> {
    await this.transport.update(user, eventId, id, body.toInput())
  }

  @Get(":id/participants")
  @ApiOperation({
    summary: "Participants of one way of transport; `own` lists those of `termId` on their own",
  })
  @ApiResponse({ status: 200, type: TransportParticipantsResponseDto })
  async participants(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("id") id: string,
    @Query("termId") termId?: string,
  ): Promise<TransportParticipantsResponseDto> {
    return this.transport.participants(user, eventId, id, termId)
  }
}
