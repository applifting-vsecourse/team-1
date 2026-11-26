import { PublicEvent } from "@/modules/applications/domain/public-event"
import { PublicEventsRepository } from "@/modules/applications/repositories/public-events.repository"
import { mock, MockProxy } from "jest-mock-extended"
import { PublicEventsService } from "./public-events.service"

const event: PublicEvent = {
  name: "Letní kemp 2027",
  description: null,
  location: null,
  terms: [
    {
      id: "t1",
      name: "1. týden",
      startsOn: "2027-07-04",
      endsOn: "2027-07-10",
      priceCzk: 4500,
    },
  ],
}

describe("PublicEventsService", () => {
  let repository: MockProxy<PublicEventsRepository>
  let service: PublicEventsService

  beforeEach(() => {
    repository = mock<PublicEventsRepository>()
    service = new PublicEventsService(repository)
  })

  it("returns the event behind the link", async () => {
    repository.findByPublicToken.mockResolvedValue({
      event,
      termsWithoutRooms: 0,
      evaluationModePending: false,
    })

    await expect(service.getByPublicToken("token")).resolves.toEqual(event)
    expect(repository.findByPublicToken).toHaveBeenCalledWith("token")
  })

  it("answers an unknown link with 404", async () => {
    repository.findByPublicToken.mockResolvedValue(null)

    await expect(service.getByPublicToken("nope")).rejects.toMatchObject({
      status: 404,
      response: { code: "NOT_FOUND" },
    })
  })

  it("answers an event with a term without rooms with 404", async () => {
    repository.findByPublicToken.mockResolvedValue({
      event,
      termsWithoutRooms: 1,
      evaluationModePending: false,
    })

    await expect(service.getByPublicToken("token")).rejects.toMatchObject({
      status: 404,
    })
  })

  it("answers an event whose evaluation mode is not chosen yet with 404 (US-560)", async () => {
    repository.findByPublicToken.mockResolvedValue({
      event,
      termsWithoutRooms: 0,
      evaluationModePending: true,
    })

    await expect(service.getByPublicToken("token")).rejects.toMatchObject({ status: 404 })
  })

  it("answers an event without terms with 404", async () => {
    repository.findByPublicToken.mockResolvedValue({
      event: { ...event, terms: [] },
      termsWithoutRooms: 0,
      evaluationModePending: false,
    })

    await expect(service.getByPublicToken("token")).rejects.toMatchObject({
      status: 404,
    })
  })

  it("answers every reason the link is closed exactly like an unknown link (#738)", async () => {
    const reasons = [
      { event, termsWithoutRooms: 1, evaluationModePending: false },
      { event, termsWithoutRooms: 0, evaluationModePending: true },
      { event: { ...event, terms: [] }, termsWithoutRooms: 0, evaluationModePending: false },
    ]
    repository.findByPublicToken.mockResolvedValueOnce(null)
    const unknown = await service.getByPublicToken("nope").catch((error: unknown) => error)

    for (const reason of reasons) {
      repository.findByPublicToken.mockResolvedValueOnce(reason)
      const closed = await service.getByPublicToken("token").catch((error: unknown) => error)
      expect(closed).toEqual(unknown)
    }
  })
})
