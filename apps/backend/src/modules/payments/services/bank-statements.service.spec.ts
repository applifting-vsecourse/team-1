import { BankTransactionsRepository } from "@/modules/payments/repositories/bank-transactions.repository"
import { PaymentsService } from "@/modules/payments/services/payments.service"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { Logger } from "@nestjs/common"
import { BankStatementsService } from "./bank-statements.service"

describe("BankStatementsService.match (US-562)", () => {
  const user = { id: "u1" } as Identity
  const unmatched = {
    id: "t1",
    externalId: "777",
    status: "UNMATCHED" as const,
    reason: "NO_VARIABLE_SYMBOL" as const,
    amountCents: 490000,
    currency: "CZK",
  }
  let repository: jest.Mocked<
    Pick<BankTransactionsRepository, "findTransaction" | "applicationBelongsToEvent" | "assign">
  >
  let notify: jest.Mock
  let service: BankStatementsService

  beforeEach(() => {
    repository = {
      findTransaction: jest.fn().mockResolvedValue(unmatched),
      applicationBelongsToEvent: jest.fn().mockResolvedValue(true),
      assign: jest.fn().mockResolvedValue([]),
    }
    notify = jest.fn().mockResolvedValue(undefined)
    service = new BankStatementsService(
      repository as unknown as BankTransactionsRepository,
      { notifyPaymentReceived: notify } as unknown as PaymentsService,
      {
        assertCanAccessEvent: jest.fn().mockResolvedValue({ organizationId: "org" }),
      } as unknown as OrganizationAccessService,
    )
  })

  it("assigns the payment under the receipt id of the import in one write and e-mails after it", async () => {
    repository.assign.mockResolvedValue([{ name: null, startsOn: new Date(), endsOn: new Date() }])
    await service.match(user, "e1", "t1", "a1", "term1")
    expect(repository.assign).toHaveBeenCalledWith({
      id: "t1",
      eventId: "e1",
      organizationId: "org",
      recordedById: "u1",
      applicationId: "a1",
      termId: "term1",
      receiptId: "bank:org:777",
    })
    expect(notify).toHaveBeenCalledWith("a1", "org", expect.any(Array))
  })

  it.each([
    ["cents", { amountCents: 100050 }],
    ["another currency", { currency: "EUR" }],
  ])("refuses a transaction with %s", async (_name, patch) => {
    repository.findTransaction.mockResolvedValue({ ...unmatched, ...patch })
    await expect(service.match(user, "e1", "t1", "a1", "term1")).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_NOT_ASSIGNABLE" },
    })
    expect(repository.assign).not.toHaveBeenCalled()
  })

  it("refuses one that is matched already, also when it is matched in the meantime", async () => {
    repository.findTransaction.mockResolvedValue({ ...unmatched, status: "MATCHED" })
    await expect(service.match(user, "e1", "t1", "a1", "term1")).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_ALREADY_MATCHED" },
    })
    expect(repository.assign).not.toHaveBeenCalled()
    repository.findTransaction.mockResolvedValue(unmatched)
    repository.assign.mockResolvedValue(null)
    await expect(service.match(user, "e1", "t1", "a1", "term1")).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_ALREADY_MATCHED" },
    })
    expect(notify).not.toHaveBeenCalled()
  })

  it("refuses with a conflict when the locked row turned out not to be assignable", async () => {
    repository.assign.mockResolvedValue("NOT_ASSIGNABLE")
    await expect(service.match(user, "e1", "t1", "a1", "term1")).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_NOT_ASSIGNABLE" },
    })
    expect(notify).not.toHaveBeenCalled()
  })

  it("finishes with success when the e-mail after the commit fails", async () => {
    repository.assign.mockResolvedValue([{ name: null, startsOn: new Date(), endsOn: new Date() }])
    notify.mockRejectedValue(new Error("mail context failed"))
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
    await expect(service.match(user, "e1", "t1", "a1", "term1")).resolves.toBeUndefined()
    expect(Logger.prototype.error).toHaveBeenCalled()
  })

  it("sends no e-mail when the write fails", async () => {
    repository.assign.mockRejectedValue(new Error("boom"))
    await expect(service.match(user, "e1", "t1", "a1", "term1")).rejects.toThrow("boom")
    expect(notify).not.toHaveBeenCalled()
  })

  it("refuses an application of another event and an unknown transaction", async () => {
    repository.applicationBelongsToEvent.mockResolvedValue(false)
    await expect(service.match(user, "e1", "t1", "a1", "term1")).rejects.toMatchObject({
      status: 403,
    })
    repository.findTransaction.mockResolvedValue(null)
    await expect(service.match(user, "e1", "t1", "a1", "term1")).rejects.toMatchObject({
      status: 403,
    })
  })
})
