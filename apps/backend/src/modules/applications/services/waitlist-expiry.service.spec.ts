import { TermStatusRepository } from "@/modules/applications/repositories/term-status.repository"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { WaitlistExpiryService } from "@/modules/applications/services/waitlist-expiry.service"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus } from "@nestjs/common"

describe("WaitlistExpiryService", () => {
  const entry = { organizationId: "org", applicationId: "a1", termId: "t1" }
  let repository: { findWaitlistedStartedBy: jest.Mock }
  let termStatus: { applyChange: jest.Mock }
  let service: WaitlistExpiryService

  beforeEach(() => {
    repository = { findWaitlistedStartedBy: jest.fn().mockResolvedValue([entry]) }
    termStatus = { applyChange: jest.fn().mockResolvedValue(undefined) }
    service = new WaitlistExpiryService(
      repository as unknown as TermStatusRepository,
      termStatus as unknown as TermStatusService,
    )
  })

  it("looks for terms started by the Prague date and cancels as the system", async () => {
    // 22:30 UTC on 1 Aug 2027 is already 2 Aug in Prague.
    const cancelled = await service.cancelExpired(new Date("2027-08-01T22:30:00Z"))

    expect(repository.findWaitlistedStartedBy).toHaveBeenCalledWith(
      new Date("2027-08-02T00:00:00.000Z"),
    )
    expect(termStatus.applyChange).toHaveBeenCalledWith({
      ...entry,
      to: "CANCELLED",
      actorId: null,
      isOverCapacityConfirmed: false,
    })
    expect(cancelled).toBe(1)
  })

  it("skips an application another run or an organizer changed meanwhile", async () => {
    termStatus.applyChange.mockRejectedValue(
      new AppException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION"),
    )

    await expect(service.cancelExpired()).resolves.toBe(0)
  })

  it("carries on with the others when one fails unexpectedly", async () => {
    repository.findWaitlistedStartedBy.mockResolvedValue([entry, { ...entry, applicationId: "a2" }])
    termStatus.applyChange.mockRejectedValueOnce(new Error("db down")).mockResolvedValue(undefined)

    await expect(service.cancelExpired()).resolves.toBe(1)
  })
})
