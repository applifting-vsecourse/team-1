import { AccountType } from "@/shared/auth/domain/identity"
import { ExecutionContext, ForbiddenException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { AccountTypeGuard } from "./account-type.guard"

const contextFor = (accountType?: AccountType, mustSetPassword = false): ExecutionContext =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({
        session: accountType ? { user: { accountType, mustSetPassword } } : undefined,
      }),
    }),
  }) as unknown as ExecutionContext

const guardAllowing = (allowed: AccountType[] | undefined): AccountTypeGuard => {
  const reflector = {
    getAllAndOverride: () => allowed,
  } as unknown as Reflector
  return new AccountTypeGuard(reflector)
}

describe("AccountTypeGuard", () => {
  it("lets the listed account type through", () => {
    expect(guardAllowing(["ORGANIZER"]).canActivate(contextFor("ORGANIZER"))).toBe(true)
  })

  it("rejects a participant on an organizer endpoint with 403", () => {
    expect(() => guardAllowing(["ORGANIZER"]).canActivate(contextFor("PARTICIPANT"))).toThrow(
      ForbiddenException,
    )
  })

  it("lets any signed-in user through when no type is listed", () => {
    expect(guardAllowing([]).canActivate(contextFor("PARTICIPANT"))).toBe(true)
    expect(guardAllowing(undefined).canActivate(contextFor("ADMIN"))).toBe(true)
  })

  it("keeps a participant without a password out until they set one", () => {
    expect.assertions(2)
    try {
      guardAllowing(["PARTICIPANT"]).canActivate(contextFor("PARTICIPANT", true))
    } catch (error) {
      expect(error).toMatchObject({ status: 403 })
      expect(error).toMatchObject({ response: { code: "PASSWORD_REQUIRED" } })
    }
  })

  it("lets a participant with a password through", () => {
    expect(guardAllowing(["PARTICIPANT"]).canActivate(contextFor("PARTICIPANT", false))).toBe(true)
  })

  it("leaves untyped endpoints open to a participant without a password", () => {
    expect(guardAllowing([]).canActivate(contextFor("PARTICIPANT", true))).toBe(true)
  })
})
