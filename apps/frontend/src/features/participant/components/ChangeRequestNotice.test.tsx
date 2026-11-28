import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { termDatesLine } from "@/lib/term-label"

import type { MyApplicationTerm } from "@/features/participant/api/applications"
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
  ] as const,
  ...overrides,
})

const renderNotice = (
  data: unknown[],
  terms: Pick<MyApplicationTerm, "termId" | "status">[] = [
    { termId: "t1", status: "CONFIRMED" },
    { termId: "t2", status: "CONFIRMED" },
  ],
) => {
  get.mockReturnValue({ json: () => Promise.resolve(data) })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ChangeRequestNotice
        applicationId="a1"
        terms={terms}
      />
    </QueryClientProvider>,
  )
}

describe("ChangeRequestNotice", () => {
  beforeEach(() => get.mockReset())

  it("shows one amber pending chip for a cancellation and lists the affected terms", async () => {
    renderNotice([request()])

    expect(await screen.findByRole("heading", { name: "Term cancellation" })).toBeVisible()
    expect(screen.getByText("Awaiting approval")).toHaveAttribute("data-variant", "warning")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByText("Current participation")).toBeVisible()
    const attendance = request()
      .terms.map((term) => `${termDatesLine(term)} · Confirmed`)
      .join(", ")
    expect(screen.getByText(attendance)).toBeVisible()
    expect(screen.getByText("Your original participation remains valid for now.")).toBeVisible()
  })

  it("shows only the affected term for a partial cancellation", async () => {
    renderNotice(
      [request({ requestedTermIds: ["t2"] })],
      [
        { termId: "t1", status: "WAITLISTED" },
        { termId: "t2", status: "CONFIRMED" },
      ],
    )

    expect(await screen.findByRole("heading", { name: "Term cancellation" })).toBeVisible()
    expect(screen.getByText(`${termDatesLine(request().terms[0])} · Waitlisted`)).toBeVisible()
    expect(
      screen.queryByText(termDatesLine(request().terms[1]), { exact: false }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Requested term")).not.toBeInTheDocument()
  })

  it("distinguishes named terms with the same dates in a pending change", async () => {
    const [current, next] = request().terms
    const requested = { ...next, startsOn: current.startsOn, endsOn: current.endsOn }
    renderNotice(
      [request({ currentTermIds: ["t1"], requestedTermIds: ["t2"], terms: [current, requested] })],
      [{ termId: "t1", status: "CONFIRMED" }],
    )

    expect(await screen.findByRole("heading", { name: "Term change" })).toBeVisible()
    expect(screen.getByText("Awaiting approval")).toHaveAttribute("data-variant", "warning")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByText("Requested term")).toBeVisible()
    expect(screen.getByText(termDatesLine(requested))).toBeVisible()
    expect(screen.getByText("Current participation")).toBeVisible()
    expect(screen.getByText(`${termDatesLine(current)} · Confirmed`)).toBeVisible()
  })

  it("omits the participation reassurance when any affected term is unconfirmed", async () => {
    renderNotice(
      [request()],
      [
        { termId: "t1", status: "CONFIRMED" },
        { termId: "t2", status: "WAITLISTED" },
      ],
    )

    expect(await screen.findByRole("heading", { name: "Term cancellation" })).toBeVisible()
    expect(
      screen.queryByText("Your original participation remains valid for now."),
    ).not.toBeInTheDocument()
  })

  it("keeps the status and the reason of a declined request", async () => {
    renderNotice([request({ status: "REJECTED", rejectionReason: "Full" })])

    expect(await screen.findByText("Declined")).toBeInTheDocument()
    const reason = screen.getByText("Reason")
    expect(reason.parentElement).toHaveTextContent("Full")
    expect(reason.parentElement?.parentElement).toContainElement(screen.getByText("Request"))
    expect(screen.queryByText("Awaiting approval")).not.toBeInTheDocument()
  })

  it.each([
    ["APPROVED", "Approved", "positive"],
    ["REJECTED", "Declined", "danger"],
  ])("colours the %s result chip by its outcome", async (status, label, variant) => {
    renderNotice([request({ status })])

    const chip = await screen.findByText(label)
    expect(chip).toHaveAttribute("data-variant", variant)
  })
})
