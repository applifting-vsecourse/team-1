import { Locale } from "@/core/email/locale"
import { CostCategoryResponseDto } from "@/modules/economics/controllers/dto/cost-category.response.dto"
import { CostCategoriesService } from "@/modules/economics/services/cost-categories.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { RequestLocale } from "@/shared/i18n/request-locale"
import { Controller, Get, Param } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("economics")
@Controller("organizer/events/:eventId/cost-categories")
@Auth("ORGANIZER")
export class OrganizerCostCategoriesController {
  constructor(private readonly categories: CostCategoriesService) {}

  @Get()
  @ApiOperation({ summary: "Cost categories of the event's organization, in order (US-813)" })
  @ApiResponse({ status: 200, type: [CostCategoryResponseDto] })
  @ApiResponse({ status: 401, description: "Not signed in." })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  async list(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @RequestLocale() locale: Locale,
  ): Promise<CostCategoryResponseDto[]> {
    const categories = await this.categories.listForEvent(user, eventId)
    return categories.map((category) => CostCategoryResponseDto.fromDomain(category, locale))
  }
}
