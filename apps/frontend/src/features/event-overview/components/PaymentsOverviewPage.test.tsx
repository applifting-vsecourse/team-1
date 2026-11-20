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

import { type PaymentOverviewEntry } from "@/features/event-overview/api/paymentOverview"
import { PaymentsOverviewPage } from "@/features/event-overview/components/PaymentsOverviewPage"

const entries: PaymentOverviewEntry[] = [
  {
    applicationId: "a1",
    applicationNumber: 23,
    variableSymbol: "23001",
    summaryVariableSymbol: "23000",
    payableCzk: 2900,
    firstName: "Adam",
    lastName: "Dvořák",
    termId: "t1",
    termName: "Summer week",
    startsOn: "2027-07-01",
    endsOn: "2027-07-07",
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
    variableSymbol: "41001",
    summaryVariableSymbol: "41000",
    payableCzk: 4900,
    firstName: "Jana",
    lastName: "Nováková",
    termId: "t1",
    termName: "Summer week",
    startsOn: "2027-07-01",
    endsOn: "2027-07-07",
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
    variableSymbol: "32001",
    summaryVariableSymbol: "32000",
    payableCzk: 0,
    firstName: "Petr",
    lastName: "Černý",
    termId: "t1",
    termName: "Summer week",
    startsOn: "2027-07-01",
    endsOn: "2027-07-07",
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
        remindedDebtorCount: 1,
        debtByFilter: {
          ALL: { ALL: 7800, SENT: 2900, NOT_SENT: 4900 },
          UNPAID: { ALL: 4900, SENT: 0, NOT_SENT: 4900 },
          PARTIALLY_PAID: { ALL: 2900, SENT: 2900, NOT_SENT: 0 },
          PAID: { ALL: 0, SENT: 0, NOT_SENT: 0 },
          OVERDUE: { ALL: 2900, SENT: 2900, NOT_SENT: 0 },
        },
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
        terms={[
          { id: "t1", name: "Summer week", startsOn: "2027-07-01", endsOn: "2027-07-07" },
          { id: "t2", name: "Second week", startsOn: "2027-07-12", endsOn: "2027-07-18" },
        ]}
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
    expect(screen.getByText("Debt across the event").parentElement).toHaveTextContent(/7,800/)
    expect(screen.getByText("2 participants with debt · all terms")).toBeVisible()
    expect(screen.getAllByRole("link", { name: /^Detail/ })).toHaveLength(3)
    expect(screen.getByRole("link", { name: "Detail Adam Dvořák" }).getAttribute("href")).toContain(
      "/organizer/events/e1/applications/a1",
    )
  })

  it("lists the payments in a table with the due date and reminders of each row", async () => {
    renderPage()
    const row = (await screen.findByText("Adam Dvořák")).closest("tr")!
    expect(row).toHaveTextContent("#23")
    expect(row).toHaveTextContent("VS 23001")
    expect(row).toHaveTextContent("Partly paid")
    expect(row).toHaveTextContent(/2,900/)
    expect(row).toHaveTextContent("past due")
    expect(row).toHaveTextContent("Reminders: 1 · last")
    expect(screen.getByRole("columnheader", { name: "Participant" })).toBeVisible()
    expect(screen.getByRole("link", { name: "Cancellation terms" })).toBeVisible()
  })

  it("filters outstanding balances across payment states and keeps the reminder filter", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole("combobox", { name: "Payment status" }))
    await user.click(await screen.findByRole("option", { name: "With debt" }))
    expect(screen.getByText("Adam Dvořák")).toBeVisible()
    expect(screen.getByText("Jana Nováková")).toBeVisible()
    expect(screen.queryByText("Petr Černý")).not.toBeInTheDocument()
    expect(screen.getByText(/debt in selection/)).toHaveTextContent(/7,800/)
    await user.click(screen.getByRole("combobox", { name: "Payment reminders" }))
    await user.click(await screen.findByRole("option", { name: "Sent, still unpaid" }))
    expect(screen.queryByText("Jana Nováková")).not.toBeInTheDocument()
    expect(screen.getByText(/debt in selection/)).toHaveTextContent(/2,900/)
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
    expect(screen.getByText(/debt in selection/)).toHaveTextContent(/2,900/)
  })

  it("intersects the search, term, status and reminder across the whole selection", async () => {
    const user = userEvent.setup()
    renderPage([
      ...entries,
      {
        ...entries[0]!,
        termId: "t2",
        termName: "Second week",
        variableSymbol: "23002",
        amountPaidCzk: 4200,
        amountOwedCzk: 700,
        payableCzk: 700,
      },
    ])
    const search = await screen.findByRole("searchbox")
    const debt = () => screen.getByText(/debt in selection/)
    await user.type(search, "dvorak Adam")
    expect(debt()).toHaveTextContent(/3,600/)
    await user.clear(search)
    await user.type(search, "23002")
    expect(debt()).toHaveTextContent(/700/)
    await user.clear(search)
    await user.type(search, "23000")
    expect(debt()).toHaveTextContent(/3,600/)
    await user.click(screen.getByRole("combobox", { name: "Term" }))
    await user.click(await screen.findByRole("option", { name: "Second week" }))
    await user.click(screen.getByRole("combobox", { name: "Payment status" }))
    await user.click(await screen.findByRole("option", { name: "With debt" }))
    await user.click(screen.getByRole("combobox", { name: "Payment reminders" }))
    await user.click(await screen.findByRole("option", { name: "Sent, still unpaid" }))
    expect(debt()).toHaveTextContent(/700/)
    expect(screen.getAllByRole("link", { name: /^Detail/ })).toHaveLength(1)
    await user.clear(search)
    await user.type(search, "Jana")
    expect(debt()).toHaveTextContent(/CZK 0/)
    await user.click(screen.getByRole("button", { name: /Clear filters/ }))
    expect(search).toHaveValue("")
    expect(screen.getAllByRole("link", { name: /^Detail/ })).toHaveLength(4)
  })

  it("prefers a complete symbol over another application with the same suffix", async () => {
    renderPage([
      { ...entries[0]!, variableSymbol: "14002", summaryVariableSymbol: "14000" },
      { ...entries[1]!, variableSymbol: "114002", summaryVariableSymbol: "114000" },
    ])
    const user = userEvent.setup()
    const search = await screen.findByRole("searchbox")
    for (const symbol of ["14002", "14000"]) {
      await user.clear(search)
      await user.type(search, symbol)
      expect(screen.getByText(/debt in selection/)).toHaveTextContent(/2,900/)
      expect(screen.queryByText("Jana Nováková")).toBeNull()
    }
    await user.clear(search)
    await user.type(search, "400")
    expect(screen.getByText(/debt in selection/)).toHaveTextContent(/7,800/)
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

  it("uses the overdue and reminder tiles as shortcuts to the filters", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole("button", { name: /^Past due/ }))
    expect(screen.getByRole("combobox", { name: "Payment status" })).toHaveTextContent("Past due")
    expect(screen.getByText(/debt in selection/)).toHaveTextContent(
      "1 application in a term · debt in selection CZK 2,900",
    )
    await user.click(screen.getByRole("button", { name: /^After a sent reminder/ }))
    expect(screen.getByRole("combobox", { name: "Payment status" })).toHaveTextContent(
      "All statuses",
    )
    expect(screen.getByRole("combobox", { name: "Payment reminders" })).toHaveTextContent(
      "Sent, still unpaid",
    )
    await user.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull()
  })

  it("identifies an unnamed term by its dates", async () => {
    renderPage([{ ...entries[0]!, termName: null }])
    expect(await screen.findByText("Adam Dvořák")).toBeVisible()
    expect(screen.getByText("1–7 Jul 2027")).toBeVisible()
  })
})
