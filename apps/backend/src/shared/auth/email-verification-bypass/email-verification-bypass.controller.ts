import { InjectBetterAuth, type BetterAuth } from "@/shared/auth/providers/better-auth.provider"
import { Config } from "@/shared/config/config.service"
import { AppException } from "@/shared/errors/app.exception"
import { RateLimitGuard } from "@/shared/rate-limit/rate-limit.guard"
import { EMAIL_VERIFICATION_BYPASS_LIMIT } from "@/shared/rate-limit/rate-limits"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"
import { IsEmail, IsOptional, IsString, MinLength, ValidateIf } from "class-validator"
import { Response } from "express"
import type { BypassOutcome } from "./email-verification-bypass.plugin"

/**
 * The proof of ownership is either the one-time token from the sign-up response or, when that
 * has expired or was lost (reload in another tab), the e-mail and password of the registration.
 */
export class EmailVerificationBypassRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  token?: string

  @ValidateIf((dto: EmailVerificationBypassRequestDto) => !dto.token)
  @IsEmail()
  email?: string

  @ValidateIf((dto: EmailVerificationBypassRequestDto) => !dto.token)
  @IsString()
  @MinLength(1)
  password?: string
}

/** The plugin's endpoint is not part of BetterAuth's inferred type (the plugin is annotated). */
type BypassApi = {
  emailVerificationBypass: (input: {
    body: { token?: string; email?: string; password?: string }
    returnHeaders: true
  }) => Promise<{ headers: Headers; response: BypassOutcome }>
}

/**
 * Staging and demo only (EMAIL_VERIFICATION_BYPASS_ENABLED): lets a freshly registered organizer
 * skip the e-mailed link when e-mails cannot be delivered. Public by nature (nobody is signed in
 * yet); the one-time token from the sign-up response is the proof of ownership.
 */
@ApiTags("auth")
@Controller("email-verification-bypass")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class EmailVerificationBypassController {
  constructor(
    private readonly config: Config,
    @InjectBetterAuth private readonly auth: BetterAuth,
  ) {}

  @Get("status")
  @ApiOperation({ summary: "Whether verifying the e-mail without the link is switched on" })
  status(): { enabled: boolean } {
    return { enabled: this.config.emailVerificationBypassEnabled }
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RateLimitGuard)
  @Throttle({ minute: EMAIL_VERIFICATION_BYPASS_LIMIT })
  @ApiOperation({
    summary:
      "Verifies the registered account (one-time token, or e-mail and password) and signs in",
  })
  async verify(
    @Body() dto: EmailVerificationBypassRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (!this.config.emailVerificationBypassEnabled) {
      throw new AppException(HttpStatus.NOT_FOUND, "EMAIL_VERIFICATION_BYPASS_DISABLED")
    }
    const { headers, response } = await (
      this.auth.api as unknown as BypassApi
    ).emailVerificationBypass({
      body: { token: dto.token, email: dto.email, password: dto.password },
      returnHeaders: true,
    })
    if (response.status !== "verified") {
      throw new AppException(HttpStatus.FORBIDDEN, "EMAIL_VERIFICATION_BYPASS_NOT_ALLOWED")
    }
    res.setHeader("Set-Cookie", headers.getSetCookie())
  }
}
