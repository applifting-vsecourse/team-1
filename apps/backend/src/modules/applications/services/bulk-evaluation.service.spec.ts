import {
  BulkConfirmationRepository,
  BulkTermState,
} from "@/modules/applications/repositories/bulk-confirmation.repository"
import { BulkEvaluationService } from "@/modules/applications/services/bulk-evaluation.service"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { ForbiddenException, HttpStatus } from "@nestjs/common"

const person = (id: string, gender: "FEMALE" | "MALE", minute: number) => ({
  applicationId: id,
  gender,
  number: minute,
  firstName: id,
  lastName: "X",
  submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
})

describe("BulkEvaluationService", () => {
  const user = { id: "u1", accountType: "ORGANIZER" } as Identity
  // One man's and one woman's bed free; Eva has no bed left in her group.
  const state: BulkTermState = {
    rooms: [
      { capacity: 2, extraBeds: 0, gender: "MALE" },
      { capacity: 2, extraBeds: 0, gender: "FEMALE" },
    ],
    confirmedGenders: ["MALE", "FEMALE"],
    // Deliberately out of order of receipt.
    candidates: [
      person("petr", "MALE", 2),
      person("eva", "FEMALE", 4),
      person("jana", "FEMALE", 3),
      person("adam", "MALE", 1),
    ],
  }
  let repository: { findTermState: jest.Mock }
  let access: { assertCanAccessEvent: jest.Mock }
  let statuses: { applyChange: jest.Mock }
  let service: BulkEvaluationService

  const calls = () =>
    statuses.applyChange.mock.calls.map(([command]) => [command.applicationId, command.to])

  beforeEach(() => {
    repository = { findTermState: jest.fn().mockResolvedValue(state) }
    access = { assertCanAccessEvent: jest.fn().mockResolvedValue({ organizationId: "org" }) }
    statuses = { applyChange: jest.fn().mockResolvedValue({}) }
    service = new BulkEvaluationService(
      repository as unknown as BulkConfirmationRepository,
      access as unknown as OrganizationAccessService,
      statuses as unknown as TermStatusService,
    )
  })

  it("previews who is confirmed and who becomes a substitute, per gender, without changing anything", async () => {
    const preview = await service.preview(user, "e1", "t1", ["adam", "petr", "jana", "eva"])

    expect(preview.selected).toEqual({ total: 4, byGender: { FEMALE: 2, MALE: 2 } })
    expect(preview.confirm).toEqual({ total: 2, byGender: { FEMALE: 1, MALE: 1 } })
    expect(preview.rest).toEqual({ total: 2, byGender: { FEMALE: 1, MALE: 1 } })
    expect(preview.freePlaces).toEqual({ FEMALE: 1, MALE: 1 })
    expect(preview.isShared).toBe(false)
    expect(statuses.applyChange).not.toHaveBeenCalled()
  })

  it("confirms those that fit and waitlists the rest through the single status change, in order of receipt", async () => {
    const result = await service.evaluate(
      user,
      "e1",
      "t1",
      ["adam", "petr", "jana", "eva", "gone"],
      2,
      "WAITLIST",
    )

    expect(calls()).toEqual([
      ["adam", "CONFIRMED"],
      ["petr", "WAITLISTED"],
      ["jana", "CONFIRMED"],
      ["eva", "WAITLISTED"],
    ])
    expect(statuses.applyChange).toHaveBeenCalledWith({
      organizationId: "org",
      applicationId: "adam",
      termId: "t1",
      to: "CONFIRMED",
      actorId: "u1",
      isOverCapacityConfirmed: false,
      expectedFrom: "TO_EVALUATE",
    })
    expect(result).toEqual({
      confirmed: ["adam", "jana"],
      waitlisted: ["petr", "eva"],
      rejected: [],
      unchanged: ["gone"],
    })
  })

  it("rejects the rest through the same status change as a single rejection when the organizer chose so", async () => {
    const result = await service.evaluate(
      user,
      "e1",
      "t1",
      ["adam", "petr", "jana", "eva"],
      2,
      "REJECT",
    )

    expect(calls()).toEqual([
      ["adam", "CONFIRMED"],
      ["petr", "CANCELLED"],
      ["jana", "CONFIRMED"],
      ["eva", "CANCELLED"],
    ])
    expect(statuses.applyChange).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: "petr",
        actorId: "u1",
        expectedFrom: "TO_EVALUATE",
      }),
    )
    expect(result).toEqual({
      confirmed: ["adam", "jana"],
      waitlisted: [],
      rejected: ["petr", "eva"],
      unchanged: [],
    })
  })

  it("changes nothing and answers 400 when some do not fit and the organizer did not choose", async () => {
    await expect(
      service.evaluate(user, "e1", "t1", ["adam", "petr", "jana", "eva"], 2),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      code: "EVALUATION_REST_REQUIRED",
    })
    expect(statuses.applyChange).not.toHaveBeenCalled()
  })

  it("needs no choice when everybody fits", async () => {
    repository.findTermState.mockResolvedValue({
      ...state,
      candidates: [person("adam", "MALE", 1), person("jana", "FEMALE", 3)],
    })
    const result = await service.evaluate(user, "e1", "t1", ["adam", "jana"], 2)
    expect(calls()).toEqual([
      ["adam", "CONFIRMED"],
      ["jana", "CONFIRMED"],
    ])
    expect(result.confirmed).toEqual(["adam", "jana"])
  })

  it("changes nothing and answers 409 when the capacity changed since the preview", async () => {
    await expect(service.evaluate(user, "e1", "t1", ["adam"], 3)).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      code: "EVALUATION_PLAN_CHANGED",
    })
    expect(statuses.applyChange).not.toHaveBeenCalled()
  })

  it("waitlists an application whose bed was taken meanwhile, and leaves one decided meanwhile", async () => {
    statuses.applyChange.mockImplementation(
      async (command: { applicationId: string; to: string }) => {
        if (command.applicationId === "adam" && command.to === "CONFIRMED")
          throw new AppException(HttpStatus.CONFLICT, "CAPACITY_EXCEEDED")
        if (command.applicationId === "petr")
          throw new AppException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION")
      },
    )

    const result = await service.evaluate(
      user,
      "e1",
      "t1",
      ["adam", "petr", "jana", "eva"],
      2,
      "WAITLIST",
    )

    expect(result).toEqual({
      confirmed: ["jana"],
      waitlisted: ["adam", "eva"],
      rejected: [],
      unchanged: ["petr"],
    })
  })

  it("does not swallow errors other than a refused change", async () => {
    statuses.applyChange.mockRejectedValue(new Error("db down"))
    await expect(service.evaluate(user, "e1", "t1", ["adam"], 2, "WAITLIST")).rejects.toThrow(
      "db down",
    )
  })

  it("answers 403 for a foreign event and 404 for a term of another event", async () => {
    access.assertCanAccessEvent.mockRejectedValue(new ForbiddenException())
    await expect(service.preview(user, "e1", "t1", ["adam"])).rejects.toBeInstanceOf(
      ForbiddenException,
    )
    access.assertCanAccessEvent.mockResolvedValue({ organizationId: "org" })
    repository.findTermState.mockResolvedValue(null)
    await expect(service.evaluate(user, "e1", "t9", ["adam"], 0)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    })
  })
})
