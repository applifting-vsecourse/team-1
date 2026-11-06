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
import { afterEach, describe, expect, it, vi } from "vitest"

import { PaymentsOverviewPage } from "@/features/event-overview/components/PaymentsOverviewPage"

const entries = [
  {
    applicationId: "a1",
    firstName: "Adam",
    lastName: "Dvořák",
    termId: "t1",
    termName: "Summer week",
    paymentStatus: "PARTIALLY_PAID",
    amountDueCzk: 4900,
    amountPaidCzk: 2000,
    amountOwedCzk: 2900,
    paymentDueAt: "2026-11-01T12:00:00Z",
    overdue: true,
    reminderCount: 1,
    lastReminderAt: "2026-11-03T12:00:00Z",
  },
  {
    applicationId: "a2",
    firstName: "Jana",
    lastName: "Nováková",
    termId: "t1",
    termName: "Summer week",
    paymentStatus: "UNPAID",
    amountDueCzk: 4900,
    amountPaidCzk: 0,
    amountOwedCzk: 4900,
    paymentDueAt: "2026-11-12T12:00:00Z",
    overdue: false,
    reminderCount: 0,
    lastReminderAt: null,
  },
  {
    applicationId: "a3",
    firstName: "Petr",
    lastName: "Černý",
    termId: "t1",
    termName: "Summer week",
    paymentStatus: "PAID",
    amountDueCzk: 4900,
    amountPaidCzk: 4900,
    amountOwedCzk: 0,
    paymentDueAt: "2026-11-01T12:00:00Z",
    overdue: false,
    reminderCount: 1,
    lastReminderAt: "2026-11-03T12:00:00Z",
  },
]

function renderPage(visibleEntries = entries) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        totalDebtCzk: 7800,
        debtorCount: 2,
        overdueCount: 1,
        entries: visibleEntries,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ),
  )
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <PaymentsOverviewPage
        eventId="e1"
        eventName="Summer camp"
      />
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe("PaymentsOverviewPage", () => {
  it("shows the unfiltered debt total and opens the existing payment history", async () => {
    renderPage()
    expect(await screen.findByText("Summer camp")).toBeVisible()
    expect(screen.getByText(/7,800/)).toBeVisible()
    expect(screen.getAllByRole("link", { name: "Payment details" })).toHaveLength(3)
    expect(
      screen.getAllByRole("link", { name: "Payment details" })[0]!.getAttribute("href"),
    ).toContain("/organizer/events/e1/applications/a1")
  })

  it("shows only still-indebted participants when filtering sent reminders", async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText("Adam Dvořák")
    await user.click(screen.getByRole("combobox", { name: "Payment reminders" }))
    await user.click(await screen.findByRole("option", { name: "Sent, still unpaid" }))
    expect(screen.getByText("Adam Dvořák")).toBeVisible()
    expect(screen.queryByText("Jana Nováková")).not.toBeInTheDocument()
    expect(screen.queryByText("Petr Černý")).not.toBeInTheDocument()
  })

  it("labels a negative balance as an overpayment", async () => {
    renderPage([
      ...entries,
      {
        ...entries[2]!,
        applicationId: "a4",
        firstName: "Eva",
        lastName: "Malá",
        amountPaidCzk: 5400,
        amountOwedCzk: -500,
        paymentStatus: "OVERPAID",
      },
    ])
    expect(await screen.findByText("Eva Malá")).toBeVisible()
    expect(screen.getByText(/Overpayment/)).toHaveTextContent("Overpayment CZK 500")
  })
})
