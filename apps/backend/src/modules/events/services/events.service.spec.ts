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
  organizationContactEmail: null,
  name: "Letní kemp 2027",
  description: null,
  location: null,
  contactEmail: null,
  contactPhone: null,
  publishedInCatalog: false,
  photoFileName: null,
  publicToken: "token",
  createdAt: new Date("2027-01-01T10:00:00Z"),
  termCount: 0,
  termsWithoutRooms: 0,
  applicationCount: 0,
  evaluationMode: "AUTOMATIC",
  cancellationStartsOn: null,
  cancellationTerms: null,
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
    repository.hasBankAccount.mockResolvedValue(true)
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

  it("blocks event creation until the organization's bank account is filled in", async () => {
    access.getOrganizationIds.mockResolvedValue(["org-a"])
    repository.hasBankAccount.mockResolvedValue(false)

    await expect(service.create(organizer, { name: "First event" })).rejects.toMatchObject({
      status: 403,
      response: { code: "ORGANIZATION_PROFILE_INCOMPLETE" },
    })
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
  describe("public page (US-122)", () => {
    const page = {
      name: "Letní kemp Lipno 2027",
      description: "Týden v přírodě",
      location: "Lipno",
      contactEmail: "info@alpine.example",
      contactPhone: null,
      publishedInCatalog: true,
    }
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2])

    beforeEach(() => {
      access.assertCanAccessEvent.mockResolvedValue({ organizationId: "org-a" })
      repository.findById.mockResolvedValue(stored)
    })

    it("saves the content under the event's organization", async () => {
      await service.updatePublicPage(organizer, "e1", { ...page, name: " Letní kemp Lipno 2027 " })

      expect(repository.updatePublicPage).toHaveBeenCalledWith("e1", "org-a", page)
    })

    it("refuses the catalog without description, place and contact e-mail", async () => {
      await expect(
        service.updatePublicPage(organizer, "e1", {
          ...page,
          description: " ",
          contactEmail: null,
        }),
      ).rejects.toMatchObject({ status: 400, response: { code: "PUBLIC_PAGE_INCOMPLETE" } })
      expect(repository.updatePublicPage).not.toHaveBeenCalled()
    })

    it("lets an incomplete page be saved while it stays out of the catalog", async () => {
      await service.updatePublicPage(organizer, "e1", {
        ...page,
        description: null,
        location: null,
        contactEmail: null,
        publishedInCatalog: false,
      })

      expect(repository.updatePublicPage).toHaveBeenCalled()
    })

    it("refuses a foreign event before saving anything", async () => {
      access.assertCanAccessEvent.mockRejectedValue(new ForbiddenException())

      await expect(service.updatePublicPage(organizer, "e9", page)).rejects.toBeInstanceOf(
        ForbiddenException,
      )
      await expect(service.savePhoto(organizer, "e9", png, "a.png")).rejects.toBeInstanceOf(
        ForbiddenException,
      )
      expect(repository.updatePublicPage).not.toHaveBeenCalled()
      expect(repository.savePhoto).not.toHaveBeenCalled()
    })

    it("stores a photo under the type its bytes have", async () => {
      await service.savePhoto(organizer, "e1", png, "lipno-2027.png")

      expect(repository.savePhoto).toHaveBeenCalledWith("e1", {
        fileName: "lipno-2027.png",
        contentType: "image/png",
        data: png,
      })
    })

    it("removes the photo of an event of the organizer", async () => {
      await service.deletePhoto(organizer, "e1")

      expect(repository.deletePhoto).toHaveBeenCalledWith("e1")
    })

    it("does not remove the photo of a foreign event", async () => {
      access.assertCanAccessEvent.mockRejectedValue(new ForbiddenException())

      await expect(service.deletePhoto(organizer, "e9")).rejects.toBeInstanceOf(ForbiddenException)
      expect(repository.deletePhoto).not.toHaveBeenCalled()
    })

    it("rejects a photo of another type or over the limit", async () => {
      await expect(
        service.savePhoto(organizer, "e1", Buffer.from("GIF89a"), "a.gif"),
      ).rejects.toMatchObject({ status: 415, response: { code: "PHOTO_INVALID_TYPE" } })
      await expect(service.savePhoto(organizer, "e1", {}, "a.png")).rejects.toMatchObject({
        status: 415,
      })
      const big = Buffer.alloc(2 * 1024 * 1024 + 1)
      png.copy(big)
      await expect(service.savePhoto(organizer, "e1", big, "a.png")).rejects.toMatchObject({
        status: 413,
        response: { code: "PHOTO_TOO_LARGE" },
      })
      expect(repository.savePhoto).not.toHaveBeenCalled()
    })
  })
})
