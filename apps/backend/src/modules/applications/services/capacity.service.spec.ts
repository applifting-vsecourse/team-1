import { CapacityRepository } from "@/modules/applications/repositories/capacity.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { ForbiddenException } from "@nestjs/common"
import { mock } from "jest-mock-extended"
import { CapacityService } from "./capacity.service"

describe("CapacityService", () => {
  const user = new Identity("organizer", "o@example.com", null, "ORGANIZER", false)

  it("scopes the snapshot to the authorized event and organization", async () => {
    const repository = mock<CapacityRepository>()
    const access = mock<OrganizationAccessService>()
    access.assertCanAccessEvent.mockResolvedValue({ organizationId: "org" })
    repository.findSnapshot.mockResolvedValue({
      terms: [{ id: "term", roomMode: "GENDERED", rooms: [], confirmed: [] }],
    })
    const result = await new CapacityService(repository, access).getCapacity(user, "event")
    expect(access.assertCanAccessEvent).toHaveBeenCalledWith(user, "event")
    expect(repository.findSnapshot).toHaveBeenCalledWith("event", "org")
    expect(result[0].freePlaces).toEqual({ FEMALE: 0, MALE: 0 })
  })

  it("never reads capacity when event access is denied", async () => {
    const repository = mock<CapacityRepository>()
    const access = mock<OrganizationAccessService>()
    access.assertCanAccessEvent.mockRejectedValue(new ForbiddenException())
    await expect(
      new CapacityService(repository, access).getCapacity(user, "foreign"),
    ).rejects.toThrow(ForbiddenException)
    expect(repository.findSnapshot).not.toHaveBeenCalled()
  })

  it("calculates a shared-room term from its own pool", async () => {
    const repository = mock<CapacityRepository>()
    const access = mock<OrganizationAccessService>()
    access.assertCanAccessEvent.mockResolvedValue({ organizationId: "org" })
    repository.findSnapshot.mockResolvedValue({
      terms: [
        {
          id: "term",
          roomMode: "SHARED",
          rooms: [{ gender: null, capacity: 5000, extraBeds: 0 }],
          confirmed: [{ gender: "FEMALE" }],
        },
      ],
    })
    expect(await new CapacityService(repository, access).getCapacity(user, "event")).toEqual([
      {
        termId: "term",
        roomMode: "SHARED",
        capacity: { FEMALE: 5000, MALE: 5000 },
        freePlaces: { FEMALE: 4999, MALE: 4999 },
      },
    ])
  })

  it("returns every term with its own mode and rooms in the details", async () => {
    const repository = mock<CapacityRepository>()
    const access = mock<OrganizationAccessService>()
    access.assertCanAccessEvent.mockResolvedValue({ organizationId: "org" })
    repository.findDetails.mockResolvedValue({
      eventName: "Shared",
      terms: [
        {
          id: "term",
          name: "Week",
          startsOn: new Date("2027-07-04"),
          endsOn: new Date("2027-07-10"),
          roomMode: "SHARED",
          rooms: [{ id: "room", name: "1", gender: null, capacity: 5000, extraBeds: 0 }],
          confirmed: [],
        },
      ],
    })
    expect(await new CapacityService(repository, access).getDetails(user, "event")).toMatchObject({
      terms: [{ roomMode: "SHARED", rooms: [{ gender: null, capacity: 5000, extraBeds: 0 }] }],
    })
  })
})
