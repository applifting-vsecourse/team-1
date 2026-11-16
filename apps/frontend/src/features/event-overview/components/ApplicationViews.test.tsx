import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApplicationViews } from "@/features/event-overview/components/ApplicationViews"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const proposal = (id: string) => ({
  termId: "t1",
  termName: null,
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  group: "MALE",
  freeBeds: 1,
  substitute: { applicationId: id, firstName: "A", lastName: id, gender: "MALE", priceCzk: 4900 },
})

function setup(proposals: object[]) {
  get.mockReturnValue({ json: () => Promise.resolve(proposals) })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ApplicationViews
        eventId="e1"
        filters={{}}
        onChange={() => undefined}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe("views of the applications (US-31)", () => {
  it("shows the number of beds waiting for confirmation on the substitutes view", async () => {
    setup([proposal("a1"), proposal("a2")])
    const chip = await screen.findByRole("radio", {
      name: "Waitlisted, beds waiting for confirmation: 2",
    })
    expect(chip).toHaveTextContent("2")
    expect(get).toHaveBeenCalledWith("organizer/events/e1/substitute-proposals")
  })

  it("shows no number without a proposal", async () => {
    setup([])
    expect(await screen.findByRole("radio", { name: "Waitlisted" })).toBeVisible()
    expect(screen.getByRole("radio", { name: "Waitlisted" })).not.toHaveTextContent(/\d/)
  })
})
