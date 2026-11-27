import { ArrangementsResponseDto } from "@/modules/participants/controllers/dto/arrangements.response.dto"
import { RoomWishesRequestDto } from "@/modules/participants/controllers/dto/room-wishes.request.dto"
import { StayRequestDto } from "@/modules/participants/controllers/dto/stay.request.dto"
import { ArrangementsRepository } from "@/modules/participants/repositories/arrangements.repository"
import { RoomWishesService } from "@/modules/participants/services/room-wishes.service"
import { StayService } from "@/modules/participants/services/stay.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

/**
 * An organizer writes for the participant what the participant can write in the application
 * (D-191): joining is not required to take part in the event. Same rules as for the participant.
 */
@ApiTags("participants")
@Auth("ORGANIZER")
@Controller("organizer/applications/:applicationId")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiResponse({ status: 403, description: "Application of another organization" })
export class OrganizerParticipantDataController {
  constructor(
    private readonly wishes: RoomWishesService,
    private readonly stays: StayService,
    private readonly arrangements: ArrangementsRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  @Get("arrangements")
  @ApiOperation({
    summary: "What the participant writes in each term (roommate wishes, stay), for the organizer",
  })
  @ApiResponse({ status: 200, type: ArrangementsResponseDto })
  async get(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
  ): Promise<ArrangementsResponseDto> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const found = await this.arrangements.find(organizationId, applicationId)
    if (!found) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return ArrangementsResponseDto.fromDomain(found)
  }

  @Put("terms/:termId/room-wishes")
  @HttpCode(204)
  @ApiOperation({
    summary:
      "Write, change or delete the roommate wishes of a confirmed term for the participant (#787)",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 409,
    description:
      "The term is not confirmed, was cancelled, or the participant has individual accommodation",
  })
  async saveRoomWishes(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Param("termId") termId: string,
    @Body() body: RoomWishesRequestDto,
  ): Promise<void> {
    await this.wishes.saveByOrganizer(user, applicationId, termId, body.names, body.noRoomWishes)
  }

  @Put("terms/:termId/stay")
  @HttpCode(204)
  @ApiOperation({
    summary: "Set, change or delete the later arrival and earlier departure in a term (#788)",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description:
      "STAY_ARRIVAL_OUTSIDE_TERM, STAY_DEPARTURE_OUTSIDE_TERM, STAY_DEPARTURE_NOT_AFTER_ARRIVAL or malformed input",
  })
  @ApiResponse({ status: 409, description: "The application in the term is cancelled or archived" })
  async saveStay(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Param("termId") termId: string,
    @Body() body: StayRequestDto,
  ): Promise<void> {
    await this.stays.saveByOrganizer(user, applicationId, termId, body)
  }
}
