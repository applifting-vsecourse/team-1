import { Locale } from "@/core/email/locale"
import {
  ManualApplicationRequestDto,
  ManualApplicationResponseDto,
} from "@/modules/applications/controllers/dto/manual-application.dto"
import { ApplicationsService } from "@/modules/applications/services/applications.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { RequestLocale } from "@/shared/i18n/request-locale"
import { Body, Controller, Param, Post, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("applications")
@Controller("organizer/events/:eventId/applications")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ManualApplicationController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: "Add an application by an organizer (US-83)" })
  @ApiResponse({ status: 201, type: ManualApplicationResponseDto })
  @ApiResponse({ status: 403, description: "Foreign event or wrong account type" })
  @ApiResponse({ status: 409, description: "Duplicate application or capacity exceeded" })
  async create(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Body() body: ManualApplicationRequestDto,
    @RequestLocale() locale: Locale,
  ): Promise<ManualApplicationResponseDto> {
    const saved = await this.applications.submitByOrganizer(user, eventId, body, locale)
    return { applicationId: saved.id, number: saved.number }
  }
}
