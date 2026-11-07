import { PaymentsService } from "@/modules/payments/services/payments.service"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"

// US-115: the simulation exists only where the environment switches it on.
describe("PaymentsService.simulate", () => {
  const user = { id: "u1" } as Identity
  const build = (enabled: boolean, organizationId: string | null) => {
    const repository = {
      findOrganizationOfUser: jest.fn().mockResolvedValue(organizationId),
      record: jest.fn().mockResolvedValue([]),
    }
    const service = new PaymentsService(
      repository as never,
      {} as never,
      {} as never,
      { paymentSimulationEnabled: enabled } as never,
    )
    return { repository, service }
  }

  it("refuses with 404 and records nothing when the simulation is off (production)", async () => {
    const { repository, service } = build(false, "o1")
    await expect(service.simulate(user, "a1", "t1")).rejects.toMatchObject({
      constructor: AppException,
      status: 404,
    })
    expect(repository.record).not.toHaveBeenCalled()
  })

  it("refuses with 403 for an application of another participant", async () => {
    const { repository, service } = build(true, null)
    await expect(service.simulate(user, "a1", "t1")).rejects.toMatchObject({ status: 403 })
    expect(repository.record).not.toHaveBeenCalled()
  })

  it("settles the remaining debt of the term with source SIMULATION", async () => {
    const { repository, service } = build(true, "o1")
    await service.simulate(user, "a1", "t1")
    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: "a1",
        organizationId: "o1",
        recordedById: "u1",
        termId: "t1",
        source: "SIMULATION",
      }),
    )
    // No amount: the repository settles whatever is still owed.
    expect(repository.record.mock.calls[0][0].amountCzk).toBeUndefined()
  })
})
