import { AccountService } from "@/modules/account/services/account.service"
import { EmailChangeService } from "@/modules/account/services/email-change.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { fromNodeHeaders } from "better-auth/node"
import { Request } from "express"
import { ChangeEmailRequestDto } from "./dto/change-email.request.dto"
import { MeResponseDto } from "./dto/me.response.dto"
import { UpdateProfileRequestDto } from "./dto/update-profile.request.dto"

@ApiTags("account")
@Controller("me")
@Auth()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class MeController {
  constructor(
    private readonly accountService: AccountService,
    private readonly emailChange: EmailChangeService,
  ) {}

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

  @Post("email-change")
  @HttpCode(204)
  @ApiOperation({
    summary:
      "The signed-in user asks for a new sign-in e-mail; it changes after the link sent there is clicked (US-125)",
  })
  @ApiResponse({ status: 204, description: "The verification link was sent to the new address" })
  @ApiResponse({
    status: 400,
    description: "VALIDATION_FAILED — not an e-mail, the current one or one of another account",
  })
  async requestEmailChange(
    @User() user: Identity,
    @Body() body: ChangeEmailRequestDto,
    @Req() request: Request,
  ): Promise<void> {
    await this.emailChange.requestChange(user, body.newEmail, fromNodeHeaders(request.headers))
  }
}
