import { AccountService } from "@/modules/account/services/account.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, Get, Patch, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { MeResponseDto } from "./dto/me.response.dto"
import { UpdateProfileRequestDto } from "./dto/update-profile.request.dto"

@ApiTags("account")
@Controller("me")
@Auth()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
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

  @Patch()
  @ApiOperation({
    summary: "The signed-in user changes their name and preferred language (US-124)",
  })
  @ApiResponse({ status: 200, type: MeResponseDto })
  @ApiResponse({ status: 400, description: "VALIDATION_FAILED — empty name or unknown language" })
  async updateProfile(
    @User() user: Identity,
    @Body() body: UpdateProfileRequestDto,
  ): Promise<MeResponseDto> {
    const account = await this.accountService.updateProfile(user, body)
    return MeResponseDto.fromDomain(account)
  }
}
