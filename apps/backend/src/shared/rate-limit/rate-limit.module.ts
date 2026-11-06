import { Config } from "@/shared/config/config.service"
import { ConfigModule } from "@applifting-io/nestjs-decorated-config"
import { Module } from "@nestjs/common"
import { ThrottlerModule } from "@nestjs/throttler"
import { APPLICATION_SUBMIT_LIMITS } from "./rate-limits"

/**
 * Limits for routes guarded by RateLimitGuard. Counters live in memory: the
 * API runs as one instance. RATE_LIMIT_ENABLED=false turns them off (E2E and
 * most integration tests, which send many requests from one address).
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule.forRootAsync(Config, { validate: true })],
      inject: [Config],
      useFactory: (config: Config) => ({
        throttlers: APPLICATION_SUBMIT_LIMITS,
        skipIf: () => !config.rateLimitEnabled,
      }),
    }),
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
