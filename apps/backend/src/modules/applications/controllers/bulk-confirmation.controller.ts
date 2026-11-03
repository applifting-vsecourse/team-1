import {
  BulkConfirmationPreviewResponseDto,
  BulkConfirmationRequestDto,
  BulkConfirmationResponseDto,
} from "@/modules/applications/controllers/dto/bulk-confirmation.dto"
import { BulkConfirmationService } from "@/modules/applications/services/bulk-confirmation.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, HttpCode, Param, Post, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("applications")
@Controller("organizer/events/:eventId/terms/:termId/bulk-confirmation")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class BulkConfirmationController {
  constructor(private readonly bulk: BulkConfirmationService) {}

  @Post("preview")
  @HttpCode(200)
  @ApiOperation({
    summary: "How many of the selected applications fit into the free beds of the term (US-107)",
  })
  @ApiResponse({ status: 200, type: BulkConfirmationPreviewResponseDto })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign event" })
  @ApiResponse({ status: 404, description: "The term is not a term of the event" })
  async preview(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() body: BulkConfirmationRequestDto,
  ): Promise<BulkConfirmationPreviewResponseDto> {
    return BulkConfirmationPreviewResponseDto.fromDomain(
      await this.bulk.preview(user, eventId, termId, body.applicationIds),
    )
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Confirm the selected applications waiting for evaluation, in order of receipt, as far as the free beds go (US-107)",
  })
  @ApiResponse({ status: 200, type: BulkConfirmationResponseDto })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign event" })
  @ApiResponse({ status: 404, description: "The term is not a term of the event" })
  async confirm(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() body: BulkConfirmationRequestDto,
  ): Promise<BulkConfirmationResponseDto> {
    return BulkConfirmationResponseDto.fromDomain(
      await this.bulk.confirm(user, eventId, termId, body.applicationIds),
    )
  }
}
