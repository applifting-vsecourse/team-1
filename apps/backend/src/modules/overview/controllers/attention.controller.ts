import { AttentionResponseDto } from "@/modules/overview/controllers/dto/attention.response.dto"
import { AttentionService } from "@/modules/overview/services/attention.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, Param } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("overview")
@Auth("ORGANIZER")
@Controller("organizer/events/:eventId/attention")
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({ status: 403, description: "Wrong account type, foreign or missing event" })
export class AttentionController {
  constructor(private readonly attention: AttentionService) {}

  @Get()
  @ApiOperation({ summary: "Counts of what needs the organizer's attention (US-51)" })
  @ApiResponse({ status: 200, type: AttentionResponseDto })
  async get(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<AttentionResponseDto> {
    return AttentionResponseDto.fromDomain(await this.attention.get(user, eventId))
  }
}
