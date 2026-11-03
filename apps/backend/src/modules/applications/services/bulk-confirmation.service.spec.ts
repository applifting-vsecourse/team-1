import {
  BulkConfirmationRepository,
  BulkTermState,
} from "@/modules/applications/repositories/bulk-confirmation.repository"
import { BulkConfirmationService } from "@/modules/applications/services/bulk-confirmation.service"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { ForbiddenException, HttpStatus } from "@nestjs/common"

const person = (id: string, gender: "FEMALE" | "MALE", minute: number, number: number) => ({
  applicationId: id,
  gender,
  number,
  firstName: id,
  lastName: "X",
  submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
})

describe("BulkConfirmationService", () => {
  const user = { id: "u1", accountType: "ORGANIZER" } as Identity
  // One man's and one woman's bed free.
  const state: BulkTermState = {
    rooms: [
      { capacity: 2, gender: "MALE" },
      { capacity: 2, gender: "FEMALE" },
    ],
    confirmedGenders: ["MALE", "FEMALE"],
    // Deliberately out of order of receipt.
    candidates: [
      person("petr", "MALE", 2, 2),
      person("jana", "FEMALE", 3, 3),
      person("adam", "MALE", 1, 1),
    ],
  }
  let repository: { findTermState: jest.Mock }
  let access: { assertCanAccessEvent: jest.Mock }
  let statuses: { applyChange: jest.Mock }
  let service: BulkConfirmationService

  beforeEach(() => {
    repository = { findTermState: jest.fn().mockResolvedValue(state) }
    access = { assertCanAccessEvent: jest.fn().mockResolvedValue({ organizationId: "org" }) }
    statuses = { applyChange: jest.fn().mockResolvedValue({}) }
    service = new BulkConfirmationService(
      repository as unknown as BulkConfirmationRepository,
      access as unknown as OrganizationAccessService,
      statuses as unknown as TermStatusService,
    )
  })

  it("previews how many fit, from the free beds per gender, without changing anything", async () => {
    const preview = await service.preview(user, "e1", "t1", ["adam", "petr", "jana"])

    expect(preview.freePlaces).toEqual({ FEMALE: 1, MALE: 1 })
    expect(preview.confirmable.map((id) => preview.names[id])).toEqual(["adam X", "jana X"])
    expect(preview.skipped).toEqual(["petr"])
    expect(preview.selectedCount).toBe(3)
    expect(statuses.applyChange).not.toHaveBeenCalled()
  })

  it("confirms through the single status change, in order of receipt, as the session user, never over capacity", async () => {
    // The real service refuses Petr once Adam took the man's bed (409 under the event lock).
    statuses.applyChange.mockImplementation(async (command: { applicationId: string }) => {
      if (command.applicationId === "petr")
        throw new AppException(HttpStatus.CONFLICT, "CAPACITY_EXCEEDED")
    })

    const result = await service.confirm(user, "e1", "t1", ["adam", "petr", "jana", "gone"])

    expect(statuses.applyChange.mock.calls.map(([command]) => command.applicationId)).toEqual([
      "adam",
      "petr",
      "jana",
    ])
    expect(statuses.applyChange).toHaveBeenCalledWith({
      organizationId: "org",
      applicationId: "adam",
      termId: "t1",
      to: "CONFIRMED",
      actorId: "u1",
      isOverCapacityConfirmed: false,
    })
    expect(result.confirmed).toEqual(["adam", "jana"])
    expect(result.unchanged.sort()).toEqual(["gone", "petr"])
  })

  it("does not swallow errors other than a refused change", async () => {
    statuses.applyChange.mockRejectedValue(new Error("db down"))
    await expect(service.confirm(user, "e1", "t1", ["adam"])).rejects.toThrow("db down")
  })

  it("answers 403 for a foreign event and 404 for a term of another event", async () => {
    access.assertCanAccessEvent.mockRejectedValue(new ForbiddenException())
    await expect(service.preview(user, "e1", "t1", ["adam"])).rejects.toBeInstanceOf(
      ForbiddenException,
    )
    access.assertCanAccessEvent.mockResolvedValue({ organizationId: "org" })
    repository.findTermState.mockResolvedValue(null)
    await expect(service.confirm(user, "e1", "t9", ["adam"])).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    })
  })
})
