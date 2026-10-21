import { SubmissionEvent } from "@/modules/applications/domain/application-submission"
import { ApplicationsRepository } from "@/modules/applications/repositories/applications.repository"
import { ApplicationConfirmationMailer } from "@/modules/participants/services/application-confirmation-mailer.service"
import { ParticipantAccountsService } from "@/modules/participants/services/participant-accounts.service"
import { mock, MockProxy } from "jest-mock-extended"
import { ApplicationsService } from "./applications.service"

const event: SubmissionEvent = {
  id: "e1",
  organizationId: "o1",
  name: "Letní kemp",
  bankAccount: "2900123456/2010",
  roomCount: 1,
  terms: [{ id: "t1", name: "1. týden", priceCzk: 4500 }],
}
const participant = {
  firstName: "Eva",
  lastName: "Nováková",
  birthDate: "2014-05-18",
  gender: "FEMALE" as const,
  termIds: ["t1"],
}

describe("ApplicationsService.submit", () => {
  let repository: MockProxy<ApplicationsRepository>
  let accounts: MockProxy<ParticipantAccountsService>
  let mailer: MockProxy<ApplicationConfirmationMailer>
  let service: ApplicationsService

  beforeEach(() => {
    repository = mock<ApplicationsRepository>()
    accounts = mock<ParticipantAccountsService>()
    mailer = mock<ApplicationConfirmationMailer>()
    service = new ApplicationsService(repository, accounts, mailer)
    repository.findEventForSubmission.mockResolvedValue(event)
    accounts.ensureAccount.mockResolvedValue({ userId: "u1", isNew: true, mustSetPassword: true })
    repository.saveEvaluated.mockResolvedValue([
      {
        number: 7,
        accessToken: "tok",
        firstName: "Eva",
        terms: [{ termId: "t1", status: "CONFIRMED", priceCzk: 4500 }],
      },
    ])
  })

  it("stores, then e-mails the amount due of the confirmed terms", async () => {
    await service.submit("link", { email: "A@Example.com", participants: [participant] }, "cs")

    expect(accounts.ensureAccount).toHaveBeenCalledWith(
      expect.objectContaining({ email: "A@Example.com", locale: "cs" }),
    )
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "a@example.com",
        applicationNumber: 7,
        amountDueCzk: 4500,
        terms: [{ name: "1. týden", status: "CONFIRMED" }],
      }),
    )
  })

  it("still succeeds when the confirmation e-mail fails", async () => {
    mailer.send.mockRejectedValue(new Error("smtp down"))
    await expect(
      service.submit("link", { email: "a@example.com", participants: [participant] }, "en"),
    ).resolves.toHaveLength(1)
  })

  it("rejects a term that is not in the event before touching accounts", async () => {
    await expect(
      service.submit(
        "link",
        { email: "a@example.com", participants: [{ ...participant, termIds: ["other"] }] },
        "en",
      ),
    ).rejects.toMatchObject({ status: 400 })
    expect(accounts.ensureAccount).not.toHaveBeenCalled()
  })

  it("answers an unknown or not yet open link with 404", async () => {
    repository.findEventForSubmission.mockResolvedValue({ ...event, roomCount: 0 })
    await expect(
      service.submit("link", { email: "a@example.com", participants: [participant] }, "en"),
    ).rejects.toMatchObject({ status: 404 })
  })
})
