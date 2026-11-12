import {
  RoomCopyRequestDto,
  RoomExtraBedsRequestDto,
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
@Controller("organizer/events/:eventId/terms/:termId")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({ status: 403, description: "Wrong account type, foreign or missing record" })
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get("rooms")
  @ApiOperation({ summary: "Rooms, room mode and capacity of one term" })
  @ApiResponse({ status: 200, type: RoomsResponseDto })
  async list(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
  ): Promise<RoomsResponseDto> {
    return RoomsResponseDto.fromDomain(await this.rooms.list(user, eventId, termId))
  }

  @Patch("room-mode")
  @HttpCode(204)
  @ApiOperation({ summary: "Choose shared or gendered rooms for the term" })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description: "Invalid room mode, or a room without a gender for gendered rooms",
  })
  async mode(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() body: RoomModeRequestDto,
  ): Promise<void> {
    await this.rooms.setMode(user, eventId, termId, body.roomMode, body.rooms ?? [])
  }

  @Post("rooms")
  @HttpCode(204)
  @ApiOperation({ summary: "Add a room to the term" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: "Invalid name, capacity or gender for room mode" })
  @ApiResponse({ status: 409, description: "Room name already used in this term" })
  async create(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() body: RoomRequestDto,
  ): Promise<void> {
    await this.rooms.save(user, eventId, termId, { ...body, gender: body.gender ?? null })
  }

  @Post("rooms/copy")
  @HttpCode(204)
  @ApiOperation({ summary: "Copy the rooms of another term of the event into this term" })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description: "Same term, a term without rooms, or a different room mode",
  })
  @ApiResponse({
    status: 409,
    description: "Copied room names already used in this term, listed in params.names",
  })
  async copy(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() body: RoomCopyRequestDto,
  ): Promise<void> {
    await this.rooms.copy(user, eventId, termId, body.sourceTermId, body.strategy)
  }

  @Put("rooms/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Edit a room of the term" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: "Invalid name, capacity or gender for room mode" })
  @ApiResponse({ status: 409, description: "Room name already used in this term" })
  async update(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Param("id") id: string,
    @Body() body: RoomRequestDto,
  ): Promise<void> {
    await this.rooms.save(user, eventId, termId, { ...body, gender: body.gender ?? null }, id)
  }

  @Patch("rooms/:id/extra-beds")
  @HttpCode(204)
  @ApiOperation({
    summary: "Set the extra beds (přistýlky) of a room in this term; each adds one bed",
    description:
      "Only this term changes. Lowering below the confirmed applications is allowed: free beds then turn negative.",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: "Not a whole number of at least 0" })
  async extraBeds(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Param("id") id: string,
    @Body() body: RoomExtraBedsRequestDto,
  ): Promise<void> {
    await this.rooms.setExtraBeds(user, eventId, termId, id, body.extraBeds)
  }

  @Delete("rooms/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove a room without changing existing confirmations" })
  @ApiResponse({ status: 204 })
  async remove(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Param("id") id: string,
  ): Promise<void> {
    await this.rooms.remove(user, eventId, termId, id)
  }
}
