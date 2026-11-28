import { QueuedEmailDispatcher } from "@/modules/participants/services/queued-email.dispatcher"
import { BankTransactionsRepository } from "@/modules/payments/repositories/bank-transactions.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { BankStatementsService } from "./bank-statements.service"

const user = { id: "u1" } as Identity

const build = (repository: object, kick: jest.Mock): BankStatementsService =>
  new BankStatementsService(
    repository as BankTransactionsRepository,
    { kick } as unknown as QueuedEmailDispatcher,
    {
      assertCanAccessEvent: jest.fn().mockResolvedValue({ organizationId: "org" }),
    } as unknown as OrganizationAccessService,
  )

describe("BankStatementsService.match (US-562)", () => {
  const unmatched = {
    id: "t1",
    status: "UNMATCHED" as const,
    reason: "NO_VARIABLE_SYMBOL" as const,
    amountCents: 490000,
    currency: "CZK",
  }
  const confirmed = { applicationId: "a1", termId: "term1", amountCents: 490000 }
  let repository: jest.Mocked<
    Pick<
      BankTransactionsRepository,
      "findTransaction" | "applicationBelongsToEvent" | "termBelongsToOrganization" | "assign"
    >
  >
  let kick: jest.Mock
  let service: BankStatementsService

  beforeEach(() => {
    repository = {
      findTransaction: jest.fn().mockResolvedValue(unmatched),
      applicationBelongsToEvent: jest.fn().mockResolvedValue(true),
      termBelongsToOrganization: jest.fn().mockResolvedValue(true),
      assign: jest.fn().mockResolvedValue("ASSIGNED"),
    }
    kick = jest.fn()
    service = build(repository, kick)
  })

  it("assigns the payment in one write and starts the e-mail queue after it", async () => {
    await service.match(user, "e1", "t1", confirmed)
    expect(repository.assign).toHaveBeenCalledWith({
      id: "t1",
      eventId: "e1",
      organizationId: "org",
      recordedById: "u1",
      applicationId: "a1",
      termId: "term1",
      previousReceiptId: null,
      amountCents: 490000,
    })
    expect(kick).toHaveBeenCalledTimes(1)
    expect(kick.mock.invocationCallOrder[0]).toBeGreaterThan(
      repository.assign.mock.invocationCallOrder[0],
    )
  })

  it.each([
    ["cents", { amountCents: 100050 }],
    ["another currency", { currency: "EUR" }],
  ])("refuses a transaction with %s", async (_name, patch) => {
    repository.findTransaction.mockResolvedValue({ ...unmatched, ...patch })
    await expect(service.match(user, "e1", "t1", confirmed)).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_NOT_ASSIGNABLE" },
    })
    expect(repository.assign).not.toHaveBeenCalled()
  })

  it("refuses one that is matched already, also when it is matched in the meantime", async () => {
    repository.findTransaction.mockResolvedValue({ ...unmatched, status: "MATCHED" })
    await expect(service.match(user, "e1", "t1", confirmed)).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_ALREADY_MATCHED" },
    })
    expect(repository.assign).not.toHaveBeenCalled()
    repository.findTransaction.mockResolvedValue(unmatched)
    repository.assign.mockResolvedValue(null)
    await expect(service.match(user, "e1", "t1", confirmed)).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_ALREADY_MATCHED" },
    })
    expect(kick).not.toHaveBeenCalled()
  })

  it("refuses with a conflict when the locked row turned out not to be assignable", async () => {
    repository.assign.mockResolvedValue("NOT_ASSIGNABLE")
    await expect(service.match(user, "e1", "t1", confirmed)).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_NOT_ASSIGNABLE" },
    })
    expect(kick).not.toHaveBeenCalled()
  })

  it("refuses with a conflict when the amount is not the confirmed one any more", async () => {
    repository.assign.mockResolvedValue("CHANGED")
    await expect(service.match(user, "e1", "t1", confirmed)).rejects.toMatchObject({
      response: { code: "BANK_TRANSACTION_CHANGED" },
    })
    expect(kick).not.toHaveBeenCalled()
  })

  it("refuses a term of another organization before anything is written", async () => {
    repository.termBelongsToOrganization.mockResolvedValue(false)
    await expect(service.match(user, "e1", "t1", confirmed)).rejects.toMatchObject({
      status: 403,
    })
    expect(repository.assign).not.toHaveBeenCalled()
  })

  it("leaves the e-mail queue alone when the write fails", async () => {
    repository.assign.mockRejectedValue(new Error("boom"))
    await expect(service.match(user, "e1", "t1", confirmed)).rejects.toThrow("boom")
    expect(kick).not.toHaveBeenCalled()
  })

  it("refuses an application of another event and an unknown transaction", async () => {
    repository.applicationBelongsToEvent.mockResolvedValue(false)
    await expect(service.match(user, "e1", "t1", confirmed)).rejects.toMatchObject({
      status: 403,
    })
    repository.findTransaction.mockResolvedValue(null)
    await expect(service.match(user, "e1", "t1", confirmed)).rejects.toMatchObject({
      status: 403,
    })
  })
})

describe("BankStatementsService.import e-mails (#737)", () => {
  const statement = [
    "ID operace;Datum;Objem;Měna;Protiúčet;Název protiúčtu;Kód banky;Název banky;KS;VS;SS;Poznámka;Zpráva pro příjemce;Typ",
    "r1;05.05.2026;100;CZK;1;Test Payer;800;CS;;7001;;;;Platba",
    "r2;05.05.2026;200;CZK;1;Test Payer;800;CS;;7001;;;;Platba",
  ].join("\r\n")

  it("starts the queue for each payment it wrote and not for a row a parallel upload took", async () => {
    const saveMatched = jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const kick = jest.fn()
    const service = build(
      {
        find: jest.fn().mockResolvedValue(null),
        findApplication: jest.fn().mockResolvedValue({
          id: "a1",
          number: 7,
          terms: [{ termId: "term1", termNumber: 1, status: "CONFIRMED", owedCzk: 300 }],
        }),
        saveMatched,
      },
      kick,
    )

    await expect(service.import(user, "e1", statement, "cs")).resolves.toMatchObject({
      matchedCount: 1,
      duplicateCount: 1,
    })
    expect(saveMatched).toHaveBeenCalledTimes(2)
    expect(kick).toHaveBeenCalledTimes(1)
  })
})
