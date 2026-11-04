import {
  BulkDecisionRequestDto,
  BulkDecisionResponseDto,
} from "@/modules/applications/controllers/dto/bulk-decision.dto"
import { BulkDecisionService } from "@/modules/applications/services/bulk-decision.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, HttpCode, Param, Post, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("applications")
@Controller("organizer/events/:eventId/terms/:termId/bulk-decision")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class BulkDecisionController {
  constructor(private readonly bulk: BulkDecisionService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Put the selected applications waiting for evaluation on the waitlist, or reject them (US-108)",
  })
  @ApiResponse({ status: 200, type: BulkDecisionResponseDto })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign event" })
  @ApiResponse({ status: 404, description: "The term is not a term of the event" })
  async decide(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() body: BulkDecisionRequestDto,
  ): Promise<BulkDecisionResponseDto> {
    return BulkDecisionResponseDto.fromDomain(
      await this.bulk.decide(user, eventId, termId, body.decision, body.applicationIds),
    )
  }
}
