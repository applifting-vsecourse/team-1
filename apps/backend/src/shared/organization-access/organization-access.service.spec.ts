import { Identity } from "@/shared/auth/domain/identity"
import { ForbiddenException } from "@nestjs/common"
import { mock, MockProxy } from "jest-mock-extended"
import { OrganizationAccessRepository } from "./organization-access.repository"
import { OrganizationAccessService } from "./organization-access.service"

const organizer = new Identity("u-a", "a@example.com", "A", "ORGANIZER", false)
const participant = new Identity("u-p", "p@example.com", "P", "PARTICIPANT", false)

describe("OrganizationAccessService", () => {
  let repository: MockProxy<OrganizationAccessRepository>
  let service: OrganizationAccessService

  beforeEach(() => {
    repository = mock<OrganizationAccessRepository>()
    service = new OrganizationAccessService(repository)
  })

  it("returns the organization of an event the organizer is a member of", async () => {
    repository.findEventOrganizationId.mockResolvedValue("org-a")
    repository.isMember.mockResolvedValue(true)

    await expect(service.assertCanAccessEvent(organizer, "event-1")).resolves.toEqual({
      organizationId: "org-a",
    })
    expect(repository.isMember).toHaveBeenCalledWith("u-a", "org-a")
  })

  it("rejects another organization's event with 403", async () => {
    repository.findEventOrganizationId.mockResolvedValue("org-b")
    repository.isMember.mockResolvedValue(false)

    await expect(service.assertCanAccessEvent(organizer, "event-b")).rejects.toThrow(
      ForbiddenException,
    )
  })

  it("answers a non-existent event with the same 403", async () => {
    repository.findEventOrganizationId.mockResolvedValue(null)

    await expect(service.assertCanAccessEvent(organizer, "nope")).rejects.toThrow(
      ForbiddenException,
    )
  })

  it("never lets a participant into organization data", async () => {
    repository.findApplicationOrganizationId.mockResolvedValue("org-a")
    repository.isMember.mockResolvedValue(true)

    await expect(service.assertCanAccessApplication(participant, "app-1")).rejects.toThrow(
      ForbiddenException,
    )
    await expect(service.getOrganizationIds(participant)).resolves.toEqual([])
    expect(repository.isMember).not.toHaveBeenCalled()
  })
})
