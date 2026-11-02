import { CreateEventDto } from "@/modules/events/controllers/dto/create-event.dto"
import { EvaluationModeRequestDto } from "@/modules/events/controllers/dto/evaluation-mode.request.dto"
import { OrganizerEventResponseDto } from "@/modules/events/controllers/dto/organizer-event.response.dto"
import { PublicPageRequestDto } from "@/modules/events/controllers/dto/public-page.request.dto"
import { EventsService } from "@/modules/events/services/events.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { Response } from "express"

const decodeFileName = (value: string | undefined): string | undefined => {
  try {
    return value === undefined ? undefined : decodeURIComponent(value)
  } catch {
    return undefined
  }
}

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

  @Put(":eventId/public-page")
  @ApiOperation({ summary: "Content of the event's public page and catalog listing (US-122)" })
  @ApiResponse({ status: 200, type: OrganizerEventResponseDto })
  @ApiResponse({ status: 400, description: "PUBLIC_PAGE_INCOMPLETE or invalid input." })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  async updatePublicPage(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Body() dto: PublicPageRequestDto,
  ): Promise<OrganizerEventResponseDto> {
    return OrganizerEventResponseDto.fromDomain(
      await this.events.updatePublicPage(user, eventId, {
        ...dto,
        description: dto.description ?? null,
        location: dto.location ?? null,
        contactEmail: dto.contactEmail ?? null,
        contactPhone: dto.contactPhone ?? null,
      }),
    )
  }

  @Put(":eventId/photo")
  @ApiOperation({
    summary: "Photo of the public page: the image bytes as the body, JPEG or PNG up to 2 MB",
  })
  @ApiResponse({ status: 200, type: OrganizerEventResponseDto })
  @ApiResponse({ status: 413, description: "PHOTO_TOO_LARGE." })
  @ApiResponse({ status: 415, description: "PHOTO_INVALID_TYPE." })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  async savePhoto(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Body() body: unknown,
    @Headers("x-file-name") encodedFileName?: string,
  ): Promise<OrganizerEventResponseDto> {
    return OrganizerEventResponseDto.fromDomain(
      await this.events.savePhoto(user, eventId, body, decodeFileName(encodedFileName)),
    )
  }

  @Get(":eventId/photo")
  @ApiOperation({
    summary: "The photo of the public page, for the preview in the organizer's form",
  })
  @ApiResponse({ status: 200, description: "The image." })
  @ApiResponse({ status: 404, description: "No photo yet." })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  async getPhoto(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Res() res: Response,
  ): Promise<void> {
    const photo = await this.events.getPhoto(user, eventId)
    res.type(photo.contentType).send(Buffer.from(photo.data))
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
