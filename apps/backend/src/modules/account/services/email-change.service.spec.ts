import { AccountRepository } from "@/modules/account/repositories/account.repository"
import { Identity } from "@/shared/auth/domain/identity"
import type { BetterAuth } from "@/shared/auth/providers/better-auth.provider"
import type { Config } from "@/shared/config/config.service"
import { AppException } from "@/shared/errors/app.exception"
import { mock, MockProxy } from "jest-mock-extended"
import { EmailChangeService } from "./email-change.service"

describe("EmailChangeService", () => {
  const changeEmail = jest.fn()
  const auth = { api: { changeEmail } } as unknown as BetterAuth
  const config = { frontendUrl: "https://app.example.com" } as Config
  const user = new Identity("u1", "eva.mala@example.cz", "Eva", "PARTICIPANT", false, "cs")
  const headers = new Headers({ cookie: "session=1" })
  let repository: MockProxy<AccountRepository>
  let service: EmailChangeService

  beforeEach(() => {
    changeEmail.mockReset()
    repository = mock<AccountRepository>()
    repository.isEmailTaken.mockResolvedValue(false)
    service = new EmailChangeService(repository, auth, config)
  })

  it("asks BetterAuth to send the link, with the lower-cased address and the landing page", async () => {
    await service.requestChange(user, " Eva.Nova@Example.cz ", headers)

    expect(changeEmail).toHaveBeenCalledWith({
      body: {
        newEmail: "eva.nova@example.cz",
        callbackURL: "https://app.example.com/email-change",
      },
      headers,
    })
  })

  it("refuses an address of another account and sends nothing", async () => {
    repository.isEmailTaken.mockResolvedValue(true)

    const attempt = service.requestChange(user, "organizator@example.com", headers)

    await expect(attempt).rejects.toMatchObject({ response: { code: "VALIDATION_FAILED" } })
    expect(changeEmail).not.toHaveBeenCalled()
  })

  it("refuses the current address, whatever its case", async () => {
    await expect(
      service.requestChange(user, "EVA.MALA@example.cz", headers),
    ).rejects.toBeInstanceOf(AppException)
    expect(changeEmail).not.toHaveBeenCalled()
  })

  it("turns a refusal by BetterAuth into the same generic error", async () => {
    changeEmail.mockRejectedValue(
      Object.assign(new Error("Email is the same"), { statusCode: 400 }),
    )

    await expect(service.requestChange(user, "eva.nova@example.cz", headers)).rejects.toMatchObject(
      {
        response: { code: "VALIDATION_FAILED" },
      },
    )
  })

  it("reports a failed delivery as its own error, not an internal one", async () => {
    changeEmail.mockRejectedValue(new Error("mail server down"))

    await expect(service.requestChange(user, "eva.nova@example.cz", headers)).rejects.toMatchObject(
      { response: { statusCode: 502, code: "EMAIL_DELIVERY_FAILED" } },
    )
  })
})
