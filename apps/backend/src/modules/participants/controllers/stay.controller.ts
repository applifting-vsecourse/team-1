import { StayRequestDto } from "@/modules/participants/controllers/dto/stay.request.dto"
import { StayService } from "@/modules/participants/services/stay.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, HttpCode, Param, Put, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("participants")
@Auth("PARTICIPANT")
@Controller("participant/applications/:applicationId/terms/:termId/stay")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class StayController {
  constructor(private readonly stays: StayService) {}

  @Put()
  @HttpCode(204)
  @ApiOperation({
    summary: "Set, change or delete the later arrival and earlier departure in a term (US-143)",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description:
      "STAY_ARRIVAL_OUTSIDE_TERM, STAY_DEPARTURE_OUTSIDE_TERM, STAY_DEPARTURE_NOT_AFTER_ARRIVAL or malformed input",
  })
  @ApiResponse({ status: 403, description: "Not the participant's application" })
  @ApiResponse({ status: 409, description: "The application in the term is cancelled or archived" })
  async save(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Param("termId") termId: string,
    @Body() body: StayRequestDto,
  ): Promise<void> {
    await this.stays.save(user, applicationId, termId, body)
  }
}
