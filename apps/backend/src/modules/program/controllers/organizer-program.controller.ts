import {
  EventProgramResponseDto,
  ProgramBlockRequestDto,
} from "@/modules/program/controllers/dto/program.dto"
import { ProgramService } from "@/modules/program/services/program.service"
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
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("program")
@Auth("ORGANIZER")
@Controller("organizer/events/:eventId/program")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({ status: 403, description: "Wrong account type, foreign or missing record" })
export class OrganizerProgramController {
  constructor(private readonly program: ProgramService) {}

  @Get()
  @ApiOperation({ summary: "Program of every active term of the event, by day and time (US-66)" })
  @ApiResponse({ status: 200, type: EventProgramResponseDto })
  async list(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<EventProgramResponseDto> {
    return this.program.list(user, eventId)
  }

  @Post("terms/:termId/blocks")
  @HttpCode(204)
  @ApiOperation({
    summary: "Add a block (day, time, name, place, description) to the program of a term",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description:
      "Missing name or invalid time, PROGRAM_END_BEFORE_START, PROGRAM_DAY_OUTSIDE_TERM or TERM_CANCELLED",
  })
  async create(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() body: ProgramBlockRequestDto,
  ): Promise<void> {
    await this.program.create(user, eventId, termId, body.toInput())
  }

  @Put("blocks/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Edit a block of the program" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: "Same as adding a block" })
  async update(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("id") id: string,
    @Body() body: ProgramBlockRequestDto,
  ): Promise<void> {
    await this.program.update(user, eventId, id, body.toInput())
  }

  @Delete("blocks/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete a block of the program" })
  @ApiResponse({ status: 204 })
  async remove(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("id") id: string,
  ): Promise<void> {
    await this.program.remove(user, eventId, id)
  }
}
