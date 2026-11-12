import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChangeRequestNotice } from "@/features/participant/components/ChangeRequestNotice"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const request = (overrides: Record<string, unknown> = {}) => ({
  id: "r1",
  applicationId: "a1",
  eventId: "e1",
  participantName: "Jana Nováková",
  participantGender: "FEMALE",
  currentTermIds: ["t1", "t2"],
  requestedTermIds: [],
  status: "PENDING",
  rejectionReason: null,
  createdAt: "2027-06-01T12:30:00.000Z",
  reviewedAt: null,
  terms: [
    { id: "t1", name: "1. týden", startsOn: "2027-07-12", endsOn: "2027-07-19", priceCzk: 4900 },
    { id: "t2", name: "2. týden", startsOn: "2027-07-19", endsOn: "2027-07-26", priceCzk: 5600 },
  ],
  ...overrides,
})

const renderNotice = (data: unknown[]) => {
  get.mockReturnValue({ json: () => Promise.resolve(data) })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ChangeRequestNotice applicationId="a1" />
    </QueryClientProvider>,
  )
}

describe("ChangeRequestNotice", () => {
  beforeEach(() => get.mockReset())

  it("shows a pending cancellation as an alert and a structured card", async () => {
    renderNotice([request()])

    expect(await screen.findByText("Request awaiting the organiser's decision")).toBeInTheDocument()
    expect(screen.getByText(/Until approval, terms, bed and payments do not change/)).toBeVisible()
    expect(screen.getByRole("heading", { name: "Requested cancellation" })).toBeInTheDocument()
    expect(screen.getByText("Request")).toBeInTheDocument()
    expect(screen.getByText("Whole application · all terms (2)")).toBeInTheDocument()
    expect(screen.getByText(/The bed is released only after approval\./)).toBeInTheDocument()
    expect(screen.queryByText("Awaiting approval")).not.toBeInTheDocument()
  })

  it("shows the original and the new term of a pending term change", async () => {
    renderNotice([request({ currentTermIds: ["t1"], requestedTermIds: ["t2"] })])

    expect(await screen.findByRole("heading", { name: "Requested term change" })).toBeVisible()
    expect(screen.getByText("Original term")).toBeInTheDocument()
    expect(screen.getByText("New term")).toBeInTheDocument()
    expect(screen.getByText("The original bed is released only after approval.")).toBeVisible()
  })

  it("keeps the status and the reason of a declined request", async () => {
    renderNotice([request({ status: "REJECTED", rejectionReason: "Full" })])

    expect(await screen.findByText("Declined")).toBeInTheDocument()
    expect(screen.getByText("Reason: Full")).toBeInTheDocument()
    expect(screen.queryByText("Request awaiting the organiser's decision")).not.toBeInTheDocument()
  })
})
