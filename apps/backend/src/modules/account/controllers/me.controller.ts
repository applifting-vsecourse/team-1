import { AccountService } from "@/modules/account/services/account.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { MeResponseDto } from "./dto/me.response.dto"

@ApiTags("account")
@Controller("me")
@Auth()
export class MeController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @ApiOperation({
    summary: "The signed-in user, account type and organizations",
  })
  @ApiResponse({ status: 200, type: MeResponseDto })
  async me(@User() user: Identity): Promise<MeResponseDto> {
    const account = await this.accountService.getAccount(user)
    return MeResponseDto.fromDomain(account)
  }
}
