import { BulkConfirmationRequestDto } from "@/modules/applications/controllers/dto/bulk-confirmation.dto"
import {
  BulkEvaluationPreviewResponseDto,
  BulkEvaluationRequestDto,
  BulkEvaluationResponseDto,
} from "@/modules/applications/controllers/dto/bulk-evaluation.dto"
import { BulkEvaluationService } from "@/modules/applications/services/bulk-evaluation.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, HttpCode, Param, Post, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("applications")
@Controller("organizer/events/:eventId/terms/:termId/bulk-evaluation")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class BulkEvaluationController {
  constructor(private readonly bulk: BulkEvaluationService) {}

  @Post("preview")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "How many of the selected applications would be confirmed and how many do not fit (US-140)",
  })
  @ApiResponse({ status: 200, type: BulkEvaluationPreviewResponseDto })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign event" })
  @ApiResponse({ status: 404, description: "The term is not a term of the event" })
  async preview(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() body: BulkConfirmationRequestDto,
  ): Promise<BulkEvaluationPreviewResponseDto> {
    return BulkEvaluationPreviewResponseDto.fromDomain(
      await this.bulk.preview(user, eventId, termId, body.applicationIds),
    )
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Evaluate the selected applications waiting for evaluation: confirm those that fit into the free beds, in order of receipt; the others are put on the waitlist or rejected as chosen (US-140)",
  })
  @ApiResponse({ status: 200, type: BulkEvaluationResponseDto })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign event" })
  @ApiResponse({ status: 404, description: "The term is not a term of the event" })
  @ApiResponse({
    status: 400,
    description: "EVALUATION_REST_REQUIRED: some applications do not fit and `rest` is missing",
  })
  @ApiResponse({
    status: 409,
    description: "EVALUATION_PLAN_CHANGED: the capacity changed since the preview, nothing changed",
  })
  async evaluate(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Body() body: BulkEvaluationRequestDto,
  ): Promise<BulkEvaluationResponseDto> {
    return BulkEvaluationResponseDto.fromDomain(
      await this.bulk.evaluate(
        user,
        eventId,
        termId,
        body.applicationIds,
        body.expectedConfirmed,
        body.rest,
      ),
    )
  }
}
