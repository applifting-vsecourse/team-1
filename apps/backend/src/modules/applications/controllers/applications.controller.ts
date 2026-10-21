import { Locale } from "@/core/email/locale"
import { SubmitApplicationRequestDto } from "@/modules/applications/controllers/dto/submit-application.request.dto"
import { SubmitApplicationResponseDto } from "@/modules/applications/controllers/dto/submit-application.response.dto"
import { ApplicationsService } from "@/modules/applications/services/applications.service"
import { RequestLocale } from "@/shared/i18n/request-locale"
import { Body, Controller, Param, Post, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

/** Public — no `@Auth`: applicants submit without an account. */
@ApiTags("applications")
@Controller("public/events")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post(":publicToken/applications")
  @ApiOperation({
    summary: "Submit an application; every selected term is confirmed or waitlisted at once",
  })
  @ApiResponse({ status: 201, type: SubmitApplicationResponseDto })
  @ApiResponse({
    status: 400,
    description: "VALIDATION_FAILED — invalid data or a term that is not in the event.",
  })
  @ApiResponse({ status: 404, description: "Unknown or not yet open link (NOT_FOUND)." })
  @ApiResponse({
    status: 409,
    description: "EMAIL_NOT_ALLOWED — the e-mail belongs to an organizer.",
  })
  async submit(
    @Param("publicToken") publicToken: string,
    @Body() body: SubmitApplicationRequestDto,
    @RequestLocale() locale: Locale,
  ): Promise<SubmitApplicationResponseDto> {
    const saved = await this.applications.submit(publicToken, body, locale)
    return SubmitApplicationResponseDto.fromDomain(saved)
  }
}
