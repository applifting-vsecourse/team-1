import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AutoConfirmedNotice } from "@/features/event-overview/components/AutoConfirmedNotice"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const record = (overrides: object = {}) => ({
  id: "r1",
  termId: "t1",
  group: "MALE",
  confirmed: { applicationId: "a1", name: "Petr Svoboda", status: "CONFIRMED" },
  skipped: [],
  changedByName: null,
  changedAt: "2027-03-10T12:00:00Z",
  ...overrides,
})
const term = (records: object[]) => ({
  termId: "t1",
  name: null,
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  status: "CONFIRMED",
  priceCzk: 4900,
  allowedStatuses: ["WAITLISTED", "CANCELLED"],
  history: [],
  substituteRecords: records,
})

function setup(records: object[], gender: "FEMALE" | "MALE" = "MALE") {
  get.mockReturnValue({ json: () => Promise.resolve([term(records)]) })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AutoConfirmedNotice
        applicationId="a1"
        firstName="Petr"
        gender={gender}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe("notice of an automatic confirmation (US-31)", () => {
  it("says the system gave the participant the first available bed and e-mailed the applicant", async () => {
    setup([record()])
    expect(await screen.findByText("Attendance was confirmed automatically")).toBeInTheDocument()
    expect(
      screen.getByText(/Petr took the first available men's bed in the term/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/We have e-mailed the applicant the payment details\./),
    ).toBeInTheDocument()
  })

  it("says nothing for a confirmation by an organizer", async () => {
    setup([record({ changedByName: "Eva" })])
    await screen.findByText(/./, undefined, { timeout: 100 }).catch(() => undefined)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("says nothing once the application is no longer confirmed", async () => {
    setup([
      record({ confirmed: { applicationId: "a1", name: "Petr Svoboda", status: "CANCELLED" } }),
    ])
    await screen.findByText(/./, undefined, { timeout: 100 }).catch(() => undefined)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("says nothing for a record of someone else's confirmation", async () => {
    setup([record({ confirmed: { applicationId: "a2", name: "Adam", status: "CONFIRMED" } })])
    await screen.findByText(/./, undefined, { timeout: 100 }).catch(() => undefined)
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
