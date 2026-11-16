import { OwnMealsResponseDto, SaveMealsRequestDto } from "@/modules/meals/controllers/dto/meals.dto"
import { MealsService } from "@/modules/meals/services/meals.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, Get, Param, Put, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("meals")
@Controller("participant/applications/:applicationId/meals")
@Auth("PARTICIPANT")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ParticipantMealsController {
  constructor(private readonly meals: MealsService) {}

  @Get()
  @ApiOperation({
    summary: "Offered meal restrictions and the ticked ones of an application (US-64)",
  })
  @ApiResponse({ status: 200, type: OwnMealsResponseDto })
  @ApiResponse({ status: 403, description: "Not the participant's own application" })
  async get(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
  ): Promise<OwnMealsResponseDto> {
    return OwnMealsResponseDto.fromDomain(await this.meals.getOwn(user, applicationId))
  }

  @Put()
  @ApiOperation({ summary: "Save the ticked restrictions and the allergies (US-64)" })
  @ApiResponse({ status: 200, type: OwnMealsResponseDto })
  @ApiResponse({ status: 400, description: "Unknown option or too long text" })
  @ApiResponse({ status: 403, description: "Not the participant's own application" })
  async save(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Body() body: SaveMealsRequestDto,
  ): Promise<OwnMealsResponseDto> {
    return OwnMealsResponseDto.fromDomain(await this.meals.saveOwn(user, applicationId, body))
  }
}
