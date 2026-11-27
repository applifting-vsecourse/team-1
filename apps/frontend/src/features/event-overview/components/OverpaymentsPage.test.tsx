import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Overpayment } from "@/features/event-overview/api/overpayments"
import type { PaymentApplication } from "@/features/event-overview/api/payments"
import { OverpaymentsPage } from "@/features/event-overview/components/OverpaymentsPage"

const first: Overpayment = {
  applicationId: "a1",
  applicationNumber: 23,
  firstName: "Adam",
  lastName: "Dvořák",
  termId: "t1",
  termName: "Summer week",
  startsOn: "2027-07-01",
  endsOn: "2027-07-07",
  status: "CANCELLED",
  variableSymbol: "23001",
  amountCzk: 700,
}
const second: Overpayment = {
  ...first,
  termId: "t2",
  termName: "Second week",
  variableSymbol: "23002",
  amountCzk: 1000,
  status: "CONFIRMED",
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  })
}

function setup(
  rows: Overpayment[],
  fetchResponse: typeof fetch = () => Promise.resolve(jsonResponse(rows)),
) {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(fetchResponse)
  const root = createRootRoute()
  const route = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <OverpaymentsPage
        eventId="e1"
        eventName="Summer camp"
        terms={[]}
      />
    ),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return fetchMock
}

afterEach(() => {
  focusManager.setFocused(undefined)
  vi.restoreAllMocks()
})

describe("OverpaymentsPage", () => {
  it("links to the application and filters term settlements by their own payment reference", async () => {
    setup([first, second])
    const table = await screen.findByRole("table")
    const search = screen.getByRole("searchbox")
    const row = within(table).getByRole("row", { name: /23001/ })
    expect(within(row).getByText("Cancelled")).toBeInTheDocument()
    expect(within(row).getByRole("link", { name: "Adam Dvořák" })).toHaveAttribute(
      "href",
      "/organizer/events/e1/applications/a1",
    )
    await userEvent.type(search, "dvorak 23002")
    expect(within(table).queryByRole("row", { name: /23001/ })).not.toBeInTheDocument()
    expect(within(table).getByRole("row", { name: /23002/ })).toBeInTheDocument()
    expect(screen.getByText(/outstanding in selection/)).toHaveTextContent(/1,000/)
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(within(table).getByRole("row", { name: /23001/ })).toBeInTheDocument()
  })

  it("keeps the typed refund during and after a background refresh on return", async () => {
    const paymentApplication = (refundableCzk: number): PaymentApplication => ({
      id: first.applicationId,
      eventId: "e1",
      eventName: "Summer camp",
      firstName: first.firstName,
      lastName: first.lastName,
      individualAccommodation: false,
      accommodationRequest: null,
      code: "C-0023",
      birthDate: "1990-05-04",
      gender: "MALE",
      pronouns: null,
      email: "adam@example.com",
      phone: null,
      isEditable: false,
      bankAccount: "123456789/0000",
      amountDueCzk: 0,
      amountPaidCzk: refundableCzk,
      amountOwedCzk: -refundableCzk,
      payableCzk: 0,
      refundableTermId: first.termId,
      terms: [
        {
          termId: first.termId,
          termNumber: 1,
          name: first.termName,
          variableSymbol: first.variableSymbol,
          status: first.status,
          priceCzk: 4900,
          startsOn: first.startsOn,
          endsOn: first.endsOn,
          dueCzk: 0,
          paidCzk: refundableCzk,
          owedCzk: -refundableCzk,
          refundableCzk,
          paymentStatus: "OVERPAID",
          paymentDueAt: null,
        },
      ],
      payments: [],
    })
    const refresh = Promise.withResolvers<void>()
    const initialResponses = new Map<string, unknown>([
      ["/organizer/events/e1/payments/overpayments", [first]],
      ["/organizer/applications/a1/payments", paymentApplication(first.amountCzk)],
    ])
    const refreshedResponses = new Map<string, unknown>([
      ["/organizer/events/e1/payments/overpayments", [{ ...first, amountCzk: 600 }]],
      ["/organizer/applications/a1/payments", paymentApplication(600)],
    ])
    const requested = new Set<string>()
    const fetchMock = setup([first], async (input) => {
      const pathname = new URL(new Request(input).url).pathname
      const endpoint = pathname.replace(/^\/api/, "")
      if (!initialResponses.has(endpoint)) throw new Error(`Unexpected request: ${pathname}`)
      if (requested.has(endpoint)) {
        await refresh.promise
        return jsonResponse(refreshedResponses.get(endpoint))
      }
      requested.add(endpoint)
      return jsonResponse(initialResponses.get(endpoint))
    })

    const table = await screen.findByRole("table")
    await userEvent.click(within(table).getByRole("button", { name: "Record refund" }))
    const dialog = await screen.findByRole("dialog")
    const amount = await within(dialog).findByRole("textbox", { name: "Amount *" })
    expect(amount).toHaveValue("700")
    await userEvent.clear(amount)
    await userEvent.type(amount, "350")

    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(
      within(screen.getByRole("dialog")).getByRole("textbox", { name: "Amount *" }),
    ).toHaveValue("350")

    refresh.resolve()
    expect(await within(dialog).findByText(/you can refund at most CZK 600/)).toBeInTheDocument()
    expect(within(dialog).getByRole("textbox", { name: "Amount *" })).toHaveValue("350")
  })

  it("shows the empty view without a refund action", async () => {
    setup([])
    expect(
      await screen.findByRole("heading", { name: "No outstanding overpayments" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Record refund" })).not.toBeInTheDocument()
  })
})
