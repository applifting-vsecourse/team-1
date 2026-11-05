import { DecisionCandidate } from "@/modules/applications/domain/bulk-decision"
import { BulkDecisionRepository } from "@/modules/applications/repositories/bulk-decision.repository"
import { BulkDecisionService } from "@/modules/applications/services/bulk-decision.service"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { ForbiddenException, HttpStatus } from "@nestjs/common"

const row = (
  applicationId: string,
  minute: number,
  status: DecisionCandidate["status"] = "TO_EVALUATE",
): DecisionCandidate => ({
  applicationId,
  status,
  number: minute,
  submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
})

describe("BulkDecisionService", () => {
  const user = { id: "u1", name: "Eva Malá", accountType: "ORGANIZER" } as Identity
  let repository: { findCandidates: jest.Mock }
  let access: { assertCanAccessEvent: jest.Mock }
  let statuses: { applyChange: jest.Mock }
  let service: BulkDecisionService

  beforeEach(() => {
    // Deliberately out of order of receipt.
    repository = {
      findCandidates: jest
        .fn()
        .mockResolvedValue([row("petr", 2), row("adam", 1), row("jana", 3, "CONFIRMED")]),
    }
    access = { assertCanAccessEvent: jest.fn().mockResolvedValue({ organizationId: "org" }) }
    statuses = { applyChange: jest.fn().mockResolvedValue({}) }
    service = new BulkDecisionService(
      repository as unknown as BulkDecisionRepository,
      access as unknown as OrganizationAccessService,
      statuses as unknown as TermStatusService,
    )
  })

  it("puts the waiting ones on the waitlist through the single status change, in order of receipt, as the session user", async () => {
    const result = await service.decide(user, "e1", "t1", "WAITLIST", [
      "petr",
      "adam",
      "jana",
      "gone",
    ])

    expect(statuses.applyChange.mock.calls.map(([command]) => command)).toEqual([
      expect.objectContaining({
        organizationId: "org",
        applicationId: "adam",
        termId: "t1",
        to: "WAITLISTED",
        actorId: "u1",
        isOverCapacityConfirmed: false,
      }),
      expect.objectContaining({ applicationId: "petr", to: "WAITLISTED", actorId: "u1" }),
    ])
    expect(result.changed).toEqual(["adam", "petr"])
    expect(result.unchanged.sort()).toEqual(["gone", "jana"])
  })

  it("rejects to Zrušená", async () => {
    await service.decide(user, "e1", "t1", "REJECT", ["adam"])

    expect(statuses.applyChange).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: "adam", to: "CANCELLED" }),
    )
  })

  it("leaves one unchanged when somebody decided it meanwhile, and goes on with the rest", async () => {
    statuses.applyChange.mockImplementation(async (command: { applicationId: string }) => {
      if (command.applicationId === "adam")
        throw new AppException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION")
    })

    const result = await service.decide(user, "e1", "t1", "WAITLIST", ["adam", "petr"])

    expect(result.changed).toEqual(["petr"])
    expect(result.unchanged).toEqual(["adam"])
  })

  it("does not swallow other failures", async () => {
    statuses.applyChange.mockRejectedValue(new Error("db down"))

    await expect(service.decide(user, "e1", "t1", "REJECT", ["adam"])).rejects.toThrow("db down")
  })

  it("changes nothing in a foreign event or for a term of another event", async () => {
    access.assertCanAccessEvent.mockRejectedValue(new ForbiddenException())
    await expect(service.decide(user, "e1", "t1", "REJECT", ["adam"])).rejects.toBeInstanceOf(
      ForbiddenException,
    )
    expect(repository.findCandidates).not.toHaveBeenCalled()

    access.assertCanAccessEvent.mockResolvedValue({ organizationId: "org" })
    repository.findCandidates.mockResolvedValue(null)
    await expect(service.decide(user, "e1", "t1", "REJECT", ["adam"])).rejects.toMatchObject({
      status: 404,
    })
    expect(statuses.applyChange).not.toHaveBeenCalled()
  })
})
