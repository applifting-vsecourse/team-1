import {
  RoomModeRequestDto,
  RoomRequestDto,
} from "@/modules/events/controllers/dto/room.request.dto"
import { RoomsResponseDto } from "@/modules/events/controllers/dto/rooms.response.dto"
import { RoomsService } from "@/modules/events/services/rooms.service"
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
  Put,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("rooms")
@Auth("ORGANIZER")
@Controller("organizer/events/:eventId")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({ status: 403, description: "Wrong account type, foreign or missing record" })
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get("rooms")
  @ApiOperation({ summary: "Rooms and capacity shared by all event terms" })
  @ApiResponse({ status: 200, type: RoomsResponseDto })
  async list(@User() user: Identity, @Param("eventId") eventId: string): Promise<RoomsResponseDto> {
    return RoomsResponseDto.fromDomain(await this.rooms.list(user, eventId))
  }

  @Patch("room-mode")
  @HttpCode(204)
  @ApiOperation({ summary: "Choose shared or gendered rooms for the event" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: "Invalid room mode" })
  @ApiResponse({ status: 409, description: "Remove shared rooms before choosing gendered rooms" })
  async mode(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Body() body: RoomModeRequestDto,
  ): Promise<void> {
    await this.rooms.setMode(user, eventId, body.roomMode)
  }

  @Post("rooms")
  @HttpCode(204)
  @ApiOperation({ summary: "Add a room to every term" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: "Invalid name, capacity or gender for room mode" })
  @ApiResponse({ status: 409, description: "Room name already used in this event" })
  async create(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Body() body: RoomRequestDto,
  ): Promise<void> {
    await this.rooms.save(user, eventId, { ...body, gender: body.gender ?? null })
  }

  @Put("rooms/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Edit a room for every term" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: "Invalid name, capacity or gender for room mode" })
  @ApiResponse({ status: 409, description: "Room name already used in this event" })
  async update(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("id") id: string,
    @Body() body: RoomRequestDto,
  ): Promise<void> {
    await this.rooms.save(user, eventId, { ...body, gender: body.gender ?? null }, id)
  }

  @Delete("rooms/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove a room without changing existing confirmations" })
  @ApiResponse({ status: 204 })
  async remove(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("id") id: string,
  ): Promise<void> {
    await this.rooms.remove(user, eventId, id)
  }
}
