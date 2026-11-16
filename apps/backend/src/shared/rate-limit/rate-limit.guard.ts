import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"
import { ThrottlerGuard } from "@nestjs/throttler"

/**
 * Rate limit of a route (`@UseGuards(RateLimitGuard)`), counted per client IP
 * (`req.ip`, see TRUSTED_PROXIES). Over the limit it answers 429 in our error
 * shape, so the frontend shows the translated TOO_MANY_REQUESTS.
 */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  // Neither argument of ThrottlerGuard's version changes the answer.
  protected override async throwThrottlingException(): Promise<void> {
    throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS", "Too many requests")
  }
}
