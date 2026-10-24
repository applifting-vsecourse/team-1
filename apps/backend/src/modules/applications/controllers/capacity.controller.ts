import {
  EventCapacityResponseDto,
  TermCapacityResponseDto,
} from "@/modules/applications/controllers/dto/term-capacity.response.dto"
import { CapacityService } from "@/modules/applications/services/capacity.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, Param, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("capacity")
@Controller("organizer/events/:eventId/capacity")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class CapacityController {
  constructor(private readonly capacityService: CapacityService) {}

  @Get("details")
  @ApiOperation({
    summary: "Gendered capacity overview; shared events return metadata without calculated terms",
  })
  @ApiResponse({ status: 200, type: EventCapacityResponseDto })
  @ApiResponse({ status: 401, description: "Authentication required" })
  @ApiResponse({ status: 403, description: "No access to the event" })
  @ApiResponse({ status: 409, description: "A gendered event contains a room without gender" })
  async details(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<EventCapacityResponseDto> {
    return EventCapacityResponseDto.fromDomain(await this.capacityService.getDetails(user, eventId))
  }

  @Get()
  @ApiOperation({ summary: "Current capacity and free beds per gender for every event term" })
  @ApiResponse({ status: 200, type: [TermCapacityResponseDto] })
  @ApiResponse({
    status: 409,
    description: "Capacity by gender is not supported for this room configuration",
  })
  @ApiResponse({ status: 401, description: "Authentication required" })
  @ApiResponse({ status: 403, description: "No access to the event" })
  async getCapacity(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<TermCapacityResponseDto[]> {
    return (await this.capacityService.getCapacity(user, eventId)).map(
      TermCapacityResponseDto.fromDomain,
    )
  }
}
