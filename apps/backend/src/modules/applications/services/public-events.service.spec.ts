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
    repository.findByPublicToken.mockResolvedValue({ event, roomCount: 2 })

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

  it("answers an event without rooms with 404", async () => {
    repository.findByPublicToken.mockResolvedValue({ event, roomCount: 0 })

    await expect(service.getByPublicToken("token")).rejects.toMatchObject({
      status: 404,
    })
  })

  it("answers an event without terms with 404", async () => {
    repository.findByPublicToken.mockResolvedValue({
      event: { ...event, terms: [] },
      roomCount: 2,
    })

    await expect(service.getByPublicToken("token")).rejects.toMatchObject({
      status: 404,
    })
  })
})
