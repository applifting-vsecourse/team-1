import { EventTerm } from "@/modules/events/domain/event-term"
import { TermsRepository } from "@/modules/events/repositories/terms.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { ForbiddenException } from "@nestjs/common"
import { mock, MockProxy } from "jest-mock-extended"
import { TermsService } from "./terms.service"

const organizer = new Identity("u1", "o@example.com", "Olga", "ORGANIZER", false)
const term = (overrides: Partial<EventTerm>): EventTerm => ({
  id: "t1",
  eventId: "e1",
  name: "Turnus",
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  priceCzk: 6900,
  capacity: 0,
  confirmedCount: 0,
  waitlistedCount: 0,
  cancelledAt: null,
  cancelReason: null,
  ...overrides,
})
const input = { name: " Turnus ", startsOn: "2027-07-12", endsOn: "2027-07-18", priceCzk: 6900 }

describe("TermsService", () => {
  let repository: MockProxy<TermsRepository>
  let access: MockProxy<OrganizationAccessService>
  let service: TermsService

  beforeEach(() => {
    repository = mock<TermsRepository>()
    access = mock<OrganizationAccessService>()
    access.assertCanAccessEvent.mockResolvedValue({ organizationId: "org-a" })
    service = new TermsService(repository, access)
  })

  it("lists active terms by date, then cancelled ones", async () => {
    repository.findByEvent.mockResolvedValue([
      term({ id: "c", startsOn: "2027-01-01", cancelledAt: new Date() }),
      term({ id: "b", startsOn: "2027-08-01" }),
      term({ id: "a", startsOn: "2027-07-01" }),
    ])
    const terms = await service.list(organizer, "e1")
    expect(terms.map(({ id }) => id)).toEqual(["a", "b", "c"])
  })

  it("trims the name and stores the term in the event's organization", async () => {
    repository.create.mockResolvedValue(term({}))
    await service.create(organizer, "e1", input)
    expect(repository.create).toHaveBeenCalledWith("org-a", "e1", { ...input, name: "Turnus" })
  })

  it("rejects an end before the start without touching the database", async () => {
    await expect(
      service.create(organizer, "e1", { ...input, endsOn: "2027-07-01" }),
    ).rejects.toMatchObject({ response: { code: "TERM_END_BEFORE_START" } })
    expect(repository.create).not.toHaveBeenCalled()
  })

  it("treats a term of another event as forbidden", async () => {
    repository.findById.mockResolvedValue(term({ eventId: "other" }))
    await expect(service.update(organizer, "e1", "t1", input)).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it("does not change a cancelled term", async () => {
    repository.findById.mockResolvedValue(term({ cancelledAt: new Date() }))
    await expect(service.update(organizer, "e1", "t1", input)).rejects.toMatchObject({
      response: { code: "TERM_CANCELLED" },
    })
    await expect(service.cancel(organizer, "e1", "t1", "důvod")).rejects.toMatchObject({
      response: { code: "TERM_CANCELLED" },
    })
  })
})
