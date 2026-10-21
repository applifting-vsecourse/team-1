import { SetPasswordRequestDto } from "@/modules/participants/controllers/dto/set-password.request.dto"
import { ParticipantPasswordService } from "@/modules/participants/services/participant-password.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("participants")
@Controller("participant/password")
// Any account type passes the guard (a participant without a password would not); the service decides.
@Auth()
export class ParticipantPasswordController {
  constructor(private readonly passwords: ParticipantPasswordService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Participant without a password chooses one (US-04)" })
  @ApiResponse({ status: 204, description: "Password set, the session stays valid" })
  @ApiResponse({ status: 400, description: "VALIDATION_FAILED — shorter than 8 characters" })
  @ApiResponse({ status: 409, description: "PASSWORD_ALREADY_SET" })
  async setPassword(@User() user: Identity, @Body() body: SetPasswordRequestDto): Promise<void> {
    await this.passwords.setPassword(user, body?.password)
  }
}
