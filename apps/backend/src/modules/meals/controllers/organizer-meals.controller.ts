import {
  KitchenTermSummaryDto,
  MealOptionDto,
  SaveMealOptionsRequestDto,
} from "@/modules/meals/controllers/dto/meals.dto"
import { MealsService } from "@/modules/meals/services/meals.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, Get, Param, Put, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("meals")
@Controller("organizer/events/:eventId/meals")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class OrganizerMealsController {
  constructor(private readonly meals: MealsService) {}

  @Get("options")
  @ApiOperation({ summary: "Meal restrictions the event offers (US-64)" })
  @ApiResponse({ status: 200, type: [MealOptionDto] })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  async listOptions(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<MealOptionDto[]> {
    const options = await this.meals.listOptions(user, eventId)
    return options.map((option) => MealOptionDto.fromDomain(option))
  }

  @Put("options")
  @ApiOperation({ summary: "Replace the list of meal restrictions of the event (US-64)" })
  @ApiResponse({ status: 200, type: [MealOptionDto] })
  @ApiResponse({ status: 400, description: "Blank or repeated name, or too many options." })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  async saveOptions(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Body() dto: SaveMealOptionsRequestDto,
  ): Promise<MealOptionDto[]> {
    const options = await this.meals.saveOptions(user, eventId, dto.options)
    return options.map((option) => MealOptionDto.fromDomain(option))
  }

  @Get("summary")
  @ApiOperation({ summary: "Meal counts and allergies per term for the kitchen (US-64)" })
  @ApiResponse({ status: 200, type: [KitchenTermSummaryDto] })
  @ApiResponse({ status: 403, description: "Unknown event or of another organization." })
  async summary(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<KitchenTermSummaryDto[]> {
    const summary = await this.meals.kitchenSummary(user, eventId)
    return summary.map((term) => KitchenTermSummaryDto.fromDomain(term))
  }
}
