import { ParticipantAccountsRepository } from "@/modules/participants/repositories/participant-accounts.repository"
import { AccountType, Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { ParticipantPasswordService } from "./participant-password.service"

const user = (accountType: AccountType, mustSetPassword: boolean): Identity =>
  new Identity("u1", "petra@example.com", "Petra", accountType, mustSetPassword)

const setup = (): {
  service: ParticipantPasswordService
  repository: { setPassword: jest.Mock }
} => {
  const repository = { setPassword: jest.fn(() => Promise.resolve()) }
  const service = new ParticipantPasswordService(
    repository as unknown as ParticipantAccountsRepository,
  )
  return { service, repository }
}

const codeOf = async (promise: Promise<unknown>): Promise<unknown> => {
  const error = await promise.catch((e: unknown) => e)
  return error instanceof AppException ? error.code : error
}

describe("ParticipantPasswordService.setPassword", () => {
  it("sets the password of a participant who has none", async () => {
    const { service, repository } = setup()

    await service.setPassword(user("PARTICIPANT", true), "my-own-password")

    expect(repository.setPassword).toHaveBeenCalledWith("u1", "my-own-password")
  })

  it("refuses a password shorter than 8 characters", async () => {
    const { service, repository } = setup()

    expect(await codeOf(service.setPassword(user("PARTICIPANT", true), "1234567"))).toBe(
      "VALIDATION_FAILED",
    )
    expect(repository.setPassword).not.toHaveBeenCalled()
  })

  it("refuses a participant who already has a password", async () => {
    const { service, repository } = setup()

    expect(await codeOf(service.setPassword(user("PARTICIPANT", false), "my-own-password"))).toBe(
      "PASSWORD_ALREADY_SET",
    )
    expect(repository.setPassword).not.toHaveBeenCalled()
  })

  it.each<AccountType>(["ORGANIZER", "ADMIN"])("refuses a %s account", async (accountType) => {
    const { service, repository } = setup()

    expect(await codeOf(service.setPassword(user(accountType, true), "my-own-password"))).toBe(
      "FORBIDDEN",
    )
    expect(repository.setPassword).not.toHaveBeenCalled()
  })
})
