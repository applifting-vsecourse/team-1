import { RoomWishesRequestDto } from "@/modules/participants/controllers/dto/room-wishes.request.dto"
import { RoomWishesService } from "@/modules/participants/services/room-wishes.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, HttpCode, Param, Put, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("participants")
@Auth("PARTICIPANT")
@Controller("participant/applications/:applicationId/terms/:termId/room-wishes")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class RoomWishesController {
  constructor(private readonly wishes: RoomWishesService) {}

  @Put()
  @HttpCode(204)
  @ApiOperation({
    summary: "Write, change or delete the roommate wishes of a confirmed term (US-146)",
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: "Not the participant's application" })
  @ApiResponse({
    status: 409,
    description:
      "The term is not confirmed, was cancelled, or the participant has individual accommodation",
  })
  async save(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Param("termId") termId: string,
    @Body() body: RoomWishesRequestDto,
  ): Promise<void> {
    await this.wishes.save(user, applicationId, termId, body.names)
  }
}
