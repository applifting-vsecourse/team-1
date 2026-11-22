import { BankTransactionsRepository } from "@/modules/payments/repositories/bank-transactions.repository"
import { PaymentsService } from "@/modules/payments/services/payments.service"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
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
    Pick<
      BankTransactionsRepository,
      "findTransaction" | "applicationBelongsToEvent" | "claim" | "release"
    >
  >
  let record: jest.Mock
  let service: BankStatementsService

  beforeEach(() => {
    repository = {
      findTransaction: jest.fn().mockResolvedValue(unmatched),
      applicationBelongsToEvent: jest.fn().mockResolvedValue(true),
      claim: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    }
    record = jest.fn().mockResolvedValue(undefined)
    service = new BankStatementsService(
      repository as unknown as BankTransactionsRepository,
      { record } as unknown as PaymentsService,
      {
        assertCanAccessEvent: jest.fn().mockResolvedValue({ organizationId: "org" }),
      } as unknown as OrganizationAccessService,
    )
  })

  it("records a BANK_IMPORT payment under the receipt id of the import and marks the transaction", async () => {
    await service.match(user, "e1", "t1", "a1", "term1")
    expect(record).toHaveBeenCalledWith(user, "a1", "bank:org:777", 4900, "term1", "BANK_IMPORT")
    expect(repository.claim).toHaveBeenCalledWith("t1", "a1", "bank:org:777")
  })

  it.each([
    ["cents", { amountCents: 100050 }],
    ["another currency", { currency: "EUR" }],
  ])("refuses a transaction with %s", async (_name, patch) => {
    repository.findTransaction.mockResolvedValue({ ...unmatched, ...patch })
    await expect(service.match(user, "e1", "t1", "a1", "term1")).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_NOT_ASSIGNABLE" },
    })
    expect(record).not.toHaveBeenCalled()
  })

  it("refuses one that is matched already, also when it is matched in the meantime", async () => {
    repository.findTransaction.mockResolvedValue({ ...unmatched, status: "MATCHED" })
    await expect(service.match(user, "e1", "t1", "a1", "term1")).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_ALREADY_MATCHED" },
    })
    expect(record).not.toHaveBeenCalled()
    repository.findTransaction.mockResolvedValue(unmatched)
    repository.claim.mockResolvedValue(false)
    await expect(service.match(user, "e1", "t1", "a1", "term1")).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_ALREADY_MATCHED" },
    })
    expect(record).not.toHaveBeenCalled()
  })

  it("gives the transaction back when the payment fails", async () => {
    record.mockRejectedValue(new Error("boom"))
    await expect(service.match(user, "e1", "t1", "a1", "term1")).rejects.toThrow("boom")
    expect(repository.release).toHaveBeenCalledWith("t1", "NO_VARIABLE_SYMBOL")
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
