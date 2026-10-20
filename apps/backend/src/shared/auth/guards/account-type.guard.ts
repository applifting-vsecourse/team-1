import { AccountType, Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

export const ACCOUNT_TYPES_KEY = "accountTypes"

/**
 * Lets through only the account types listed with `@Auth(...)`. Runs after
 * `AuthenticatedUserGuard`, so a missing session is already a 401 by now; a
 * signed-in user of the wrong type is a 403 (US-02).
 *
 * A participant who arrived by magic link and has not chosen a password yet
 * (US-01) is signed in but not let into anything typed: 403 `PASSWORD_REQUIRED`
 * until they set one. Endpoints with plain `@Auth()` (e.g. `/me`, and the one
 * that sets the password) stay open to them.
 */
@Injectable()
export class AccountTypeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<AccountType[] | undefined>(ACCOUNT_TYPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!allowed || allowed.length === 0) return true

    const request = context.switchToHttp().getRequest<{
      session?: { user?: Identity }
    }>()
    const user = request.session?.user
    const accountType = user?.accountType

    if (!accountType || !allowed.includes(accountType)) {
      throw new ForbiddenException()
    }
    if (accountType === "PARTICIPANT" && user?.mustSetPassword) {
      throw new AppException(HttpStatus.FORBIDDEN, "PASSWORD_REQUIRED", "Set your password first")
    }
    return true
  }
}
