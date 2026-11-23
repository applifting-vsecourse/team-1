import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MyApplicationTerm } from "@/features/participant/api/applications"
import { TermStaySection } from "@/features/participant/components/TermStay"

const { put } = vi.hoisted(() => ({ put: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { put } }))

const term = (overrides: Partial<MyApplicationTerm> = {}): MyApplicationTerm => ({
  termId: "t1",
  name: "Letní týden",
  startsOn: "2027-07-12",
  endsOn: "2027-07-19",
  status: "CONFIRMED",
  priceCzk: 4500,
  transportOffered: false,
  transportDecided: false,
  stay: { lateArrival: null, earlyDeparture: null },
  ...overrides,
})

const renderSection = (terms: MyApplicationTerm[]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TermStaySection
        applicationId="a1"
        terms={terms}
      />
    </QueryClientProvider>,
  )

const ADD = /^Add late arrival or early departure – /
const open = async () => userEvent.click(screen.getByRole("button", { name: ADD }))
describe("TermStaySection", () => {
  beforeEach(() => {
    put.mockReset().mockResolvedValue(undefined)
  })

  it("shows nothing for a term without the field (cancelled or archived)", () => {
    const { container } = renderSection([term({ stay: undefined, status: "CANCELLED" })])
    expect(container).toBeEmptyDOMElement()
  })

  it("shows a short visible label with the full action and the term as its accessible name", () => {
    renderSection([term()])
    const button = screen.getByRole("button", { name: ADD })
    expect(button).toHaveTextContent(/^Add$/)
    expect(button).not.toHaveClass("whitespace-normal")
  })

  it("shows no arrival or departure while none is given", () => {
    renderSection([term()])
    expect(screen.queryByText(/^Arrival /)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Departure /)).not.toBeInTheDocument()
  })

  it("returns keyboard focus to the selected term after closing its dialog", async () => {
    renderSection([term(), term({ termId: "t2" })])
    const action = screen.getAllByRole("button", { name: ADD })[1]!
    await userEvent.click(action)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(action).toHaveFocus())
    expect(put).not.toHaveBeenCalled()
  })

  it("saves a departure only, leaving the arrival empty", async () => {
    renderSection([term()])
    await open()
    const [, departureDate] = screen.getAllByLabelText("Date", { selector: "input" })
    await userEvent.type(departureDate!, "18. 7. 2027")
    const [, departureTime] = screen.getAllByLabelText("Time", { selector: "input" })
    await userEvent.type(departureTime!, "16:00")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("participant/applications/a1/terms/t1/stay", {
        json: { lateArrival: null, earlyDeparture: "2027-07-18T16:00" },
      }),
    )
  })

  it("refuses a date outside the term without saving", async () => {
    renderSection([term()])
    await open()
    const [arrivalDate] = screen.getAllByLabelText("Date", { selector: "input" })
    await userEvent.type(arrivalDate!, "11. 7. 2027")
    const [arrivalTime] = screen.getAllByLabelText("Time", { selector: "input" })
    await userEvent.type(arrivalTime!, "10:30")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText(/The arrival date must be between/)).toBeVisible()
    expect(put).not.toHaveBeenCalled()
  })

  it("refuses a departure that is not later than the arrival", async () => {
    renderSection([
      term({ stay: { lateArrival: "2027-07-13T10:30", earlyDeparture: "2027-07-13T09:45" } }),
    ])
    await userEvent.click(screen.getByRole("button", { name: /^Edit arrival or departure – / }))
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText("The departure must be later than the arrival.")).toBeVisible()
    expect(put).not.toHaveBeenCalled()
  })

  it("shows the saved values and changes them", async () => {
    renderSection([
      term({ stay: { lateArrival: "2027-07-13T10:30", earlyDeparture: "2027-07-18T16:00" } }),
    ])
    expect(screen.getByText("Arrival 13 Jul 2027 at 10:30")).toBeVisible()
    expect(screen.getByText("Departure 18 Jul 2027 at 16:00")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: /^Edit arrival or departure – / }))
    const [, departureTime] = screen.getAllByLabelText("Time", { selector: "input" })
    await userEvent.clear(departureTime!)
    await userEvent.type(departureTime!, "17:30")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("participant/applications/a1/terms/t1/stay", {
        json: { lateArrival: "2027-07-13T10:30", earlyDeparture: "2027-07-18T17:30" },
      }),
    )
  })

  it("deletes both after a confirmation", async () => {
    renderSection([term({ stay: { lateArrival: "2027-07-13T10:30", earlyDeparture: null } })])
    await userEvent.click(screen.getByRole("button", { name: /^Edit arrival or departure – / }))
    await userEvent.click(screen.getByRole("button", { name: "Delete all details" }))
    expect(screen.getByRole("heading", { name: "Delete arrival and departure?" })).toBeVisible()
    expect(put).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Delete details" }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("participant/applications/a1/terms/t1/stay", {
        json: { lateArrival: null, earlyDeparture: null },
      }),
    )
  })

  it("removes only the arrival", async () => {
    renderSection([
      term({ stay: { lateArrival: "2027-07-13T10:30", earlyDeparture: "2027-07-18T16:00" } }),
    ])
    await userEvent.click(screen.getByRole("button", { name: /^Edit arrival or departure – / }))
    await userEvent.click(screen.getByRole("button", { name: "Remove arrival" }))
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("participant/applications/a1/terms/t1/stay", {
        json: { lateArrival: null, earlyDeparture: "2027-07-18T16:00" },
      }),
    )
  })
})
