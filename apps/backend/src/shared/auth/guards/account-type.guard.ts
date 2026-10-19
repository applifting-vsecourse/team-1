import { AccountType, Identity } from "@/shared/auth/domain/identity"
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"

export const ACCOUNT_TYPES_KEY = "accountTypes"

/**
 * Lets through only the account types listed with `@Auth(...)`. Runs after
 * `AuthenticatedUserGuard`, so a missing session is already a 401 by now; a
 * signed-in user of the wrong type is a 403 (US-02).
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
    const accountType = request.session?.user?.accountType

    if (!accountType || !allowed.includes(accountType)) {
      throw new ForbiddenException()
    }
    return true
  }
}
