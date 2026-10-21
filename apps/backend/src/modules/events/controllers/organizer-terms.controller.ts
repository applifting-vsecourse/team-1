import { CancelTermDto, TermDto } from "@/modules/events/controllers/dto/term.dto"
import { TermResponseDto } from "@/modules/events/controllers/dto/term.response.dto"
import { TermsService } from "@/modules/events/services/terms.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, Get, Param, Patch, Post, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("events")
@Controller("organizer/events/:eventId/terms")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class OrganizerTermsController {
  constructor(private readonly terms: TermsService) {}

  @Get()
  @ApiOperation({
    summary: "Terms of an event, active ones sorted by date, then cancelled (US-13)",
  })
  @ApiResponse({ status: 200, type: [TermResponseDto] })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  async list(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<TermResponseDto[]> {
    const terms = await this.terms.list(user, eventId)
    return terms.map((term) => TermResponseDto.fromDomain(term))
  }

  @Post()
  @ApiOperation({ summary: "Add a term to the event" })
  @ApiResponse({ status: 201, type: TermResponseDto })
  @ApiResponse({ status: 400, description: "TERM_END_BEFORE_START or invalid input." })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  async create(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Body() dto: TermDto,
  ): Promise<TermResponseDto> {
    return TermResponseDto.fromDomain(await this.terms.create(user, eventId, dto))
  }

  @Patch(":termId")
  @ApiOperation({ summary: "Edit a term" })
  @ApiResponse({ status: 200, type: TermResponseDto })
  @ApiResponse({ status: 400, description: "TERM_END_BEFORE_START or invalid input." })
  @ApiResponse({ status: 403, description: "Unknown term or of another organization." })
  @ApiResponse({ status: 409, description: "TERM_CANCELLED." })
  async update(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() dto: TermDto,
  ): Promise<TermResponseDto> {
    return TermResponseDto.fromDomain(await this.terms.update(user, eventId, termId, dto))
  }

  @Post(":termId/cancel")
  @ApiOperation({
    summary: "Cancel a term: it is no longer offered, applications and history stay",
  })
  @ApiResponse({ status: 201, type: TermResponseDto })
  @ApiResponse({ status: 403, description: "Unknown term or of another organization." })
  @ApiResponse({ status: 409, description: "TERM_CANCELLED." })
  async cancel(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() dto: CancelTermDto,
  ): Promise<TermResponseDto> {
    return TermResponseDto.fromDomain(await this.terms.cancel(user, eventId, termId, dto.reason))
  }
}
