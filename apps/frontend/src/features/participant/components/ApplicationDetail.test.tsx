import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MyApplication } from "@/features/participant/api/applications"
import { ApplicationDetail } from "@/features/participant/components/ApplicationDetail"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const confirmed = {
  termId: "t1",
  name: "1. týden",
  startsOn: "2027-07-04",
  endsOn: "2027-07-10",
  status: "CONFIRMED" as const,
  priceCzk: 4500,
}
const waitlisted = {
  termId: "t2",
  name: "2. týden",
  startsOn: "2027-07-11",
  endsOn: "2027-07-17",
  status: "WAITLISTED" as const,
  priceCzk: 4900,
}

const application = (overrides: Partial<MyApplication> = {}): MyApplication => ({
  id: "a1",
  eventName: "Letní kemp 2027",
  firstName: "Jana",
  lastName: "Nováková",
  code: "LKL-0048",
  variableSymbol: "0048",
  terms: [confirmed],
  amountDueCzk: 4500,
  amountPaidCzk: 2000,
  amountOwedCzk: 2500,
  paymentStatus: "PARTIALLY_PAID",
  paymentDetails: { bankAccount: "2900123456/2010", variableSymbol: "0048" },
  ...overrides,
})

const renderDetail = (data: MyApplication) => {
  get.mockReturnValue({ json: () => Promise.resolve(data) })
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ApplicationDetail applicationId="a1" />
      </QueryClientProvider>
    ),
  })
  const list = createRoute({ getParentRoute: () => root, path: "/participant" })
  const router = createRouter({
    routeTree: root.addChildren([list]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
}

describe("ApplicationDetail", () => {
  it("copies the account and preserves leading zeros in the variable symbol", async () => {
    const user = userEvent.setup()
    const write = vi.spyOn(navigator.clipboard, "writeText")
    renderDetail(application())
    await user.click(await screen.findByRole("button", { name: "Copy account number" }))
    expect(write).toHaveBeenLastCalledWith("2900123456/2010")
    await user.click(screen.getByRole("button", { name: "Copy variable symbol" }))
    expect(write).toHaveBeenLastCalledWith("0048")
  })

  beforeEach(() => get.mockReset())

  it("shows what is due, what is paid, what is left and where to send it", async () => {
    renderDetail(application())

    expect(
      await screen.findByRole("heading", { level: 1, name: "Letní kemp 2027" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Left to pay")).toBeInTheDocument()
    expect(screen.getByText("Partly paid")).toBeInTheDocument()
    expect(screen.getByText("2900123456/2010")).toBeInTheDocument()
    expect(screen.getByText("0048")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "← All applications" })).toHaveAttribute(
      "href",
      "/participant",
    )
  })

  it("names the event prominently with the application code", async () => {
    renderDetail(application())

    expect(
      await screen.findByRole("heading", { level: 1, name: "Letní kemp 2027" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Jana Nováková · LKL-0048")).toBeInTheDocument()
    expect(screen.queryByText("My application")).not.toBeInTheDocument()
  })

  it("offers the transfer details only while something is left to pay", async () => {
    renderDetail(application())
    expect(await screen.findByRole("heading", { name: "Payment details" })).toBeInTheDocument()
  })

  it("shows an overpayment as an overpayment, not as zero", async () => {
    renderDetail(
      application({ amountPaidCzk: 5100, amountOwedCzk: -600, paymentStatus: "OVERPAID" }),
    )

    expect(await screen.findByText("Overpayment")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Payment information" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Payment details" })).not.toBeInTheDocument()
    expect(screen.queryByText("Left to pay")).not.toBeInTheDocument()
    expect(screen.queryByText("To pay")).not.toBeInTheDocument()
  })

  it("shows a waitlisted term as waitlisted without a place in line, not to be paid yet", async () => {
    renderDetail(application({ terms: [confirmed, waitlisted] }))

    expect(await screen.findByText("Waitlisted")).toBeInTheDocument()
    expect(screen.getByText("Do not pay anything yet")).toBeInTheDocument()
    expect(screen.queryByText(/in line|position/i)).not.toBeInTheDocument()
    expect(
      screen.getByText(/Don't pay for a term where you are waitlisted yet/),
    ).toBeInTheDocument()
  })

  it("shows no payment block when every term is waitlisted", async () => {
    renderDetail(
      application({
        terms: [waitlisted],
        amountDueCzk: 0,
        amountOwedCzk: 0,
        amountPaidCzk: 0,
        paymentStatus: "NOTHING_DUE",
        paymentDetails: null,
      }),
    )

    expect(await screen.findByText("Waitlisted")).toBeInTheDocument()
    expect(screen.queryByText("Payment for the confirmed term")).not.toBeInTheDocument()
    expect(screen.queryByText("Account number")).not.toBeInTheDocument()
  })
})
