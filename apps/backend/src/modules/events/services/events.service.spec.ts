import { StoredEvent } from "@/modules/events/domain/organizer-event"
import { EventsRepository } from "@/modules/events/repositories/events.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { ForbiddenException } from "@nestjs/common"
import { mock, MockProxy } from "jest-mock-extended"
import { EventsService } from "./events.service"

const stored: StoredEvent = {
  id: "e1",
  organizationId: "org-a",
  organizationName: "Letní kemp z. s.",
  name: "Letní kemp 2027",
  description: null,
  location: null,
  publicToken: "token",
  createdAt: new Date("2027-01-01T10:00:00Z"),
  termCount: 0,
  roomCount: 0,
  applicationCount: 0,
  evaluationMode: "AUTOMATIC",
  startsOn: null,
  endsOn: null,
  terms: [],
}
const organizer = new Identity("u1", "o@example.com", "Olga", "ORGANIZER", false)

describe("EventsService", () => {
  let repository: MockProxy<EventsRepository>
  let access: MockProxy<OrganizationAccessService>
  let service: EventsService

  beforeEach(() => {
    repository = mock<EventsRepository>()
    access = mock<OrganizationAccessService>()
    repository.create.mockResolvedValue(stored)
    service = new EventsService(repository, access)
  })

  it("creates an event in the only organization of the organizer with a fresh token", async () => {
    access.getOrganizationIds.mockResolvedValue(["org-a"])

    const event = await service.create(organizer, {
      name: "  Letní kemp 2027 ",
      description: "  ",
      location: "Lipno",
    })

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        name: "Letní kemp 2027",
        description: null,
        location: "Lipno",
        publicToken: expect.stringMatching(/^[\w-]{20,}$/) as string,
      }),
    )
    expect(event.applicationsOpen).toBe(false)
  })

  it("checks membership of a requested organization", async () => {
    access.assertCanAccessOrganization.mockRejectedValue(new ForbiddenException())

    await expect(
      service.create(organizer, { organizationId: "org-b", name: "X" }),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it("asks for an organization when the organizer has several", async () => {
    access.getOrganizationIds.mockResolvedValue(["org-a", "org-b"])

    await expect(service.create(organizer, { name: "X" })).rejects.toMatchObject({ status: 400 })
  })

  it("rejects a blank name", async () => {
    await expect(service.create(organizer, { name: "   " })).rejects.toMatchObject({
      status: 400,
      response: { code: "VALIDATION_FAILED" },
    })
  })

  it("lists only events of the organizer's organizations", async () => {
    access.getOrganizationIds.mockResolvedValue(["org-a"])
    repository.findByOrganizations.mockResolvedValue([stored])

    await expect(service.list(organizer)).resolves.toHaveLength(1)
    expect(repository.findByOrganizations).toHaveBeenCalledWith(["org-a"])
  })

  it("refuses a foreign event before reading it", async () => {
    access.assertCanAccessEvent.mockRejectedValue(new ForbiddenException())

    await expect(service.get(organizer, "e9")).rejects.toBeInstanceOf(ForbiddenException)
    expect(repository.findById).not.toHaveBeenCalled()
  })
})
