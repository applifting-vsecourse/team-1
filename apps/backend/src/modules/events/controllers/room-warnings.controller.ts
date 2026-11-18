import { AcknowledgeRoomWarningRequestDto } from "@/modules/events/controllers/dto/room-warnings.request.dto"
import { RoomAssignmentsService } from "@/modules/events/services/room-assignments.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("room assignments")
@Auth("ORGANIZER")
@Controller("organizer/events/:eventId/terms/:termId/room-warnings")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({ status: 403, description: "Wrong account type, foreign or missing record" })
export class RoomWarningsController {
  constructor(private readonly assignments: RoomAssignmentsService) {}

  @Post("acknowledgements")
  @HttpCode(204)
  @ApiOperation({
    summary: "Knowingly confirm a warning of the room rules, with a note only organizers see",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, description: "The warning does not hold (any more)" })
  async acknowledge(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() body: AcknowledgeRoomWarningRequestDto,
  ): Promise<void> {
    // A room warning names a room, the warning about a missing bed an application, never both.
    const isForRoom = body.kind !== "CONFIRMED_WITHOUT_BED"
    const roomId = isForRoom ? (body.roomId ?? null) : null
    const applicationTermId = isForRoom ? null : (body.applicationTermId ?? null)
    if ((isForRoom ? roomId : applicationTermId) === null) {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    }
    await this.assignments.acknowledgeWarning(user, eventId, termId, {
      kind: body.kind,
      roomId,
      applicationTermId,
      note: (body.note ?? "").trim(),
    })
  }
}
