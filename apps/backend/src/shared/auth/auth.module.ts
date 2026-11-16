import { MailModule } from "@/core/email/mail.module"
import { PrismaModule } from "@/core/prisma/prisma.module"
import { Config } from "@/shared/config/config.service"
import { RateLimitModule } from "@/shared/rate-limit/rate-limit.module"
import { ConfigModule } from "@applifting-io/nestjs-decorated-config"
import { Module } from "@nestjs/common"
import { EmailVerificationBypassController } from "./email-verification-bypass/email-verification-bypass.controller"
import { betterAuthProvider } from "./providers/better-auth.provider"
import { AuthUserRepository } from "./repositories/auth-user.repository"
import { MagicLinkService } from "./services/magic-link.service"

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRootAsync(Config, { validate: true }),
    MailModule,
    RateLimitModule,
  ],
  controllers: [EmailVerificationBypassController],
  providers: [betterAuthProvider, MagicLinkService, AuthUserRepository],
  exports: [betterAuthProvider, MagicLinkService],
})
export class AuthModule {}
