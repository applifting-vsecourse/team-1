import { RoomAssignmentRequestDto } from "@/modules/events/controllers/dto/room-assignments.request.dto"
import { RoomAssignmentsResponseDto } from "@/modules/events/controllers/dto/room-assignments.response.dto"
import { RoomAssignmentsService } from "@/modules/events/services/room-assignments.service"
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
  Put,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("room assignments")
@Auth("ORGANIZER")
@Controller("organizer/events/:eventId/terms/:termId/room-assignments")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({ status: 403, description: "Wrong account type, foreign or missing record" })
export class RoomAssignmentsController {
  constructor(private readonly assignments: RoomAssignmentsService) {}

  @Get()
  @ApiOperation({ summary: "Rooms of the term with who sleeps where, and who has no room yet" })
  @ApiResponse({ status: 200, type: RoomAssignmentsResponseDto })
  async list(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
  ): Promise<RoomAssignmentsResponseDto> {
    return RoomAssignmentsResponseDto.fromDomain(await this.assignments.list(user, eventId, termId))
  }

  @Put(":applicationTermId")
  @HttpCode(204)
  @ApiOperation({
    summary: "Assign a participant to a room of the term, or move them to another room",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 409,
    description:
      "Room full, participant not assignable, room of another term, cancelled term, or no room of the same name in an other term",
  })
  async assign(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Param("applicationTermId") applicationTermId: string,
    @Body() body: RoomAssignmentRequestDto,
  ): Promise<void> {
    await this.assignments.assign(
      user,
      eventId,
      termId,
      applicationTermId,
      body.roomId,
      body.alsoTermIds ?? [],
    )
  }

  @Delete(":applicationTermId")
  @HttpCode(204)
  @ApiOperation({ summary: "Take a participant out of their room" })
  @ApiResponse({ status: 204 })
  async unassign(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Param("applicationTermId") applicationTermId: string,
  ): Promise<void> {
    await this.assignments.unassign(user, eventId, termId, applicationTermId)
  }
}
