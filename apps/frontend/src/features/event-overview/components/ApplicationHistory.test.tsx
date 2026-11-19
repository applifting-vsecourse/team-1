import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApplicationHistory } from "@/features/event-overview/components/ApplicationHistory"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const entries = [
  {
    id: "payment-r2",
    kind: "PAYMENT",
    at: "2026-11-05T13:20:00Z",
    author: "Jakub Kafka",
    amountCzk: -500,
    isCorrection: false,
    isCancelled: false,
  },
  {
    id: "payment-r1",
    kind: "PAYMENT",
    at: "2026-11-04T09:00:00Z",
    author: "Jakub Kafka",
    amountCzk: 2000,
    isCorrection: false,
    isCancelled: true,
  },
  {
    id: "status-c1",
    kind: "STATUS_CHANGE",
    at: "2026-11-03T08:15:00Z",
    author: null,
    termName: "Letní týden",
    startsOn: "2027-07-12",
    endsOn: "2027-07-19",
    fromStatus: "TO_EVALUATE",
    toStatus: "CONFIRMED",
  },
  {
    id: "created",
    kind: "APPLICATION_CREATED",
    at: "2026-11-03T08:15:00Z",
    author: "jana@example.cz",
  },
]

function setup() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ApplicationHistory applicationId="a1" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ApplicationHistory", () => {
  it("shows an edit of the details as field: before → after, with its author (#515)", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve([
          {
            id: "edit-e1",
            kind: "EDIT",
            at: "2026-11-17T13:02:00Z",
            author: "Jana Svobodová",
            changes: [
              { field: "lastName", from: "Nowak", to: "Novák" },
              { field: "phone", from: null, to: "+420777123456" },
              { field: "birthDate", from: "2014-05-04", to: "2014-05-05" },
              { field: "individualAccommodation", from: "false", to: "true" },
              { field: "accommodationRequest" },
            ],
          },
          entries[3],
        ]),
    })
    setup()

    const [edit] = within(await screen.findByRole("list")).getAllByRole("listitem")
    expect(edit).toHaveTextContent("Jana Svobodová")
    expect(edit).toHaveTextContent("Last name: Nowak → Novák")
    expect(edit).toHaveTextContent("Phone: — → +420777123456")
    expect(edit).toHaveTextContent("Date of birth: 4 May 2014 → 5 May 2014")
    expect(edit).toHaveTextContent("Individual accommodation: no → yes")
    // The note's values are not listed, only that it changed.
    expect(edit).toHaveTextContent("Accommodation note: changed")
  })

  it("lists every change with its time, author and change", async () => {
    get.mockReturnValue({ json: () => Promise.resolve(entries) })
    setup()

    const items = within(await screen.findByRole("list")).getAllByRole("listitem")
    expect(items).toHaveLength(4)
    expect(get).toHaveBeenCalledWith("organizer/applications/a1/history")
    expect(items[0]).toHaveTextContent("Jakub Kafka · Refund")
    expect(items[1]).toHaveTextContent("Payment +CZK 2,000")
    expect(items[1]).toHaveTextContent("Cancelled")
    expect(items[2]).toHaveTextContent("System · Letní týden: Awaiting evaluation → Confirmed")
    expect(items[3]).toHaveTextContent("jana@example.cz · Application created")
  })

  it("shows an error with a retry when the history does not load", async () => {
    get.mockReturnValue({ json: () => Promise.reject(new Error("boom")) })
    setup()

    expect(await screen.findByText("Could not load the history of changes")).toBeInTheDocument()
  })
})
