import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BankStatementImportPage } from "@/features/event-overview/components/BankStatementImportPage"

const transaction = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  bookedOn: "2026-05-05",
  amountCents: 490000,
  currency: "CZK",
  variableSymbol: null,
  counterpartyName: "Hana Novotná",
  message: "Camp",
  reason: "NO_VARIABLE_SYMBOL",
  applicationId: null,
  applicantName: null,
  ...overrides,
})

const term = (termId: string, termNumber: number, owedCzk: number, paidCzk = 0) => ({
  termId,
  termNumber,
  name: `Week ${termNumber}`,
  startsOn: "2027-07-12",
  endsOn: "2027-07-19",
  status: "CONFIRMED",
  owedCzk,
  paidCzk,
})
const jana = {
  id: "a1",
  number: 2027002,
  firstName: "Jana",
  lastName: "Nováková",
  terms: [term("t1", 1, 4900)],
}
const two = { ...jana, terms: [term("t1", 1, 4900), term("t2", 2, 4900)] }

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

function renderPage(options: {
  rows: ReturnType<typeof transaction>[]
  candidates?: unknown[]
  match?: () => Response
}) {
  let rows = options.rows
  const calls: Request[] = []
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const request = new Request(input, init)
    calls.push(request)
    if (request.url.includes("/application-candidates")) {
      return Promise.resolve(json({ candidates: options.candidates ?? [] }))
    }
    if (request.url.endsWith("/match")) {
      const response = options.match?.() ?? new Response(null, { status: 204 })
      if (response.ok) rows = rows.filter((row) => !request.url.includes(`/${row.id}/`))
      return Promise.resolve(response)
    }
    return Promise.resolve(json({ transactions: rows }))
  })
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <BankStatementImportPage eventId="e1" />,
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider
        router={createRouter({
          routeTree: root.addChildren([page]),
          history: createMemoryHistory({ initialEntries: ["/"] }),
        })}
      />
    </QueryClientProvider>,
  )
  return calls
}

afterEach(() => vi.restoreAllMocks())

describe("manual match of an unmatched payment (US-562)", () => {
  it("opens the row with the application its variable symbol points to, selected beforehand", async () => {
    renderPage({
      rows: [
        transaction("b1", {
          variableSymbol: "2027002001",
          reason: "UNKNOWN_VARIABLE_SYMBOL",
          applicationId: "a1",
          applicantName: "Jana Nováková",
        }),
      ],
      candidates: [two],
    })
    await userEvent.click(await screen.findByRole("button", { name: /^Assign/ }))
    expect(await screen.findByText(/Jana Nováková · #2027002/)).toBeVisible()
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(2)
    expect(radios[0]).toBeChecked()
    expect(radios[1]).not.toBeChecked()
    expect(screen.getAllByText("owed CZK 4,900").length).toBeGreaterThan(0)
    expect(screen.getByText("After saving")).toBeVisible()
    expect(screen.getByText(/Paid CZK 0 → CZK 4,900, CZK 0 left/)).toBeVisible()
    // Only one panel at a time; the opened row has no button, "Cancel" closes it.
    expect(screen.queryByRole("button", { name: /^Assign payment/ })).not.toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByText("After saving")).toBeNull()
  })

  it("assigns the payment to the chosen term, says so and the row disappears", async () => {
    const calls = renderPage({ rows: [transaction("b1")], candidates: [two] })
    await userEvent.click(await screen.findByRole("button", { name: /^Assign/ }))
    await userEvent.type(screen.getByLabelText("Find an application"), "Jana")
    const radios = await screen.findAllByRole("radio")
    // Two terms and no symbol: nothing is chosen for the organizer.
    expect(radios[0]).not.toBeChecked()
    await userEvent.click(radios[1]!)
    await userEvent.click(screen.getByRole("button", { name: "Assign payment" }))
    await waitFor(() => expect(screen.queryByText("Hana Novotná")).toBeNull())
    expect(await screen.findByText("No unmatched payments.")).toBeVisible()
    const post = calls.find((request) => request.url.endsWith("/bank-transactions/b1/match"))!
    expect(await post.json()).toEqual({ applicationId: "a1", termId: "t2" })
  })

  it("shows an overpayment instead of what is left", async () => {
    renderPage({
      rows: [transaction("b1", { amountCents: 550000 })],
      candidates: [jana],
    })
    await userEvent.click(await screen.findByRole("button", { name: /^Assign/ }))
    await userEvent.type(screen.getByLabelText("Find an application"), "Jana")
    expect(await screen.findByText(/overpaid by CZK 600/)).toBeVisible()
  })

  it("says so when no application matches", async () => {
    renderPage({ rows: [transaction("b1")], candidates: [] })
    await userEvent.click(await screen.findByRole("button", { name: /^Assign/ }))
    await userEvent.type(screen.getByLabelText("Find an application"), "Nobody")
    expect(await screen.findByText("No application matches")).toBeVisible()
    expect(screen.queryByText("After saving")).toBeNull()
  })

  it("keeps the panel open with the error above the buttons when the server refuses", async () => {
    renderPage({
      rows: [transaction("b1")],
      candidates: [jana],
      match: () =>
        json({ statusCode: 409, code: "BANK_TRANSACTION_ALREADY_MATCHED", message: "x" }, 409),
    })
    await userEvent.click(await screen.findByRole("button", { name: /^Assign/ }))
    await userEvent.type(screen.getByLabelText("Find an application"), "Jana")
    await userEvent.click(await screen.findByRole("radio"))
    await userEvent.click(screen.getByRole("button", { name: "Assign payment" }))
    const alert = await screen.findByRole("alert")
    expect(within(alert).getByText(/already assigned/)).toBeVisible()
    expect(screen.getByRole("button", { name: "Assign payment" })).toBeEnabled()
  })
})
