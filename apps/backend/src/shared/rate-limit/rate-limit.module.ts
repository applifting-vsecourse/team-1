import { Config } from "@/shared/config/config.service"
import { ConfigModule } from "@applifting-io/nestjs-decorated-config"
import { ExecutionContext, Module } from "@nestjs/common"
import { ThrottlerModule } from "@nestjs/throttler"
import { applicantEmail } from "./applicant-email"
import { APPLICANT_EMAIL_LIMIT, APPLICATION_SUBMIT_LIMITS } from "./rate-limits"

const emailOf = (context: ExecutionContext): string | null =>
  applicantEmail(context.switchToHttp().getRequest<{ body?: unknown }>().body)

/**
 * Limits for routes guarded by RateLimitGuard: per client IP, and per applicant e-mail where the
 * body carries one (a route with another meaning of `email` opts out with `@SkipThrottle`).
 * Counters live in memory: the
 * API runs as one instance. RATE_LIMIT_ENABLED=false turns them off (E2E and
 * most integration tests, which send many requests from one address).
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule.forRootAsync(Config, { validate: true })],
      inject: [Config],
      useFactory: (config: Config) => ({
        throttlers: [
          ...APPLICATION_SUBMIT_LIMITS,
          {
            ...APPLICANT_EMAIL_LIMIT,
            getTracker: (request) => applicantEmail(request.body) as string,
            // A throttler's own `skipIf` replaces the common one, so the switch is repeated here.
            skipIf: (context) => !config.rateLimitEnabled || emailOf(context) === null,
          },
        ],
        skipIf: () => !config.rateLimitEnabled,
      }),
    }),
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
