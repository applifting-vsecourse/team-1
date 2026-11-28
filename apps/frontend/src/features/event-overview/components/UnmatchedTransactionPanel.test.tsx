import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query"
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

// The backend computes what the payment does to the term; the mock does the same arithmetic.
const term = (
  termId: string,
  termNumber: number,
  owedCzk: number,
  paidCzk = 0,
  amountCzk = 4900,
) => ({
  termId,
  termNumber,
  name: `Week ${termNumber}`,
  startsOn: "2027-07-12",
  endsOn: "2027-07-19",
  status: "CONFIRMED",
  owedCzk,
  paidCzk,
  afterPayment: {
    fromCzk: paidCzk,
    toCzk: paidCzk + amountCzk,
    restCzk: Math.max(0, owedCzk - amountCzk),
    overCzk: Math.max(0, amountCzk - owedCzk),
  },
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
  /** How many candidate searches fail before one succeeds. */
  searchFailures?: number
  /** Candidate searches fail while this says so. */
  isSearchDown?: () => boolean
  match?: () => Response
  /** The match request answers only after this promise settles. */
  matchGate?: Promise<void>
}) {
  let rows = options.rows
  const calls: Request[] = []
  let searchFailures = options.searchFailures ?? 0
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const request = new Request(input, init)
    calls.push(request)
    if (request.url.includes("/application-candidates")) {
      if (searchFailures > 0 || options.isSearchDown?.()) {
        searchFailures--
        return Promise.resolve(json({ statusCode: 500, code: "INTERNAL", message: "x" }, 500))
      }
      return Promise.resolve(json({ candidates: options.candidates ?? [] }))
    }
    if (request.url.endsWith("/match")) {
      const response = options.match?.() ?? new Response(null, { status: 204 })
      if (response.ok) rows = rows.filter((row) => !request.url.includes(`/${row.id}/`))
      return (options.matchGate ?? Promise.resolve()).then(() => response)
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

afterEach(() => {
  vi.restoreAllMocks()
  focusManager.setFocused(undefined)
})

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

  it("sends the previous receipt when assigning a reopened transaction", async () => {
    const previousReceiptId = "bank-manual:previous"
    const calls = renderPage({
      rows: [transaction("b1", { previousReceiptId })],
      candidates: [jana],
    })
    await userEvent.click(await screen.findByRole("button", { name: "Assign Hana Novotná" }))
    await userEvent.type(screen.getByLabelText("Find an application"), "Jana")
    await userEvent.click(await screen.findByRole("radio"))
    await userEvent.click(screen.getByRole("button", { name: "Assign payment" }))
    await waitFor(() => expect(screen.queryByText("Hana Novotná")).toBeNull())
    const post = calls.find((request) => request.url.endsWith("/bank-transactions/b1/match"))!
    expect(await post.json()).toEqual({ applicationId: "a1", termId: "t1", previousReceiptId })
  })

  it("closes only the panel of the saved transaction, not the one opened meanwhile", async () => {
    let release = (): void => undefined
    const matchGate = new Promise<void>((resolve) => {
      release = resolve
    })
    renderPage({
      rows: [transaction("b1"), transaction("b2", { counterpartyName: "Petr Svoboda" })],
      candidates: [jana],
      matchGate,
    })
    await userEvent.click(await screen.findByRole("button", { name: "Assign Hana Novotná" }))
    await userEvent.type(screen.getByLabelText("Find an application"), "Jana")
    await userEvent.click((await screen.findAllByRole("radio"))[0]!)
    await userEvent.click(screen.getByRole("button", { name: "Assign payment" }))
    // The save of b1 is still running when the panel of b2 is opened and filled in.
    await userEvent.click(screen.getByRole("button", { name: "Assign Petr Svoboda" }))
    await userEvent.type(screen.getByLabelText("Find an application"), "Draft")
    release()
    await waitFor(() => expect(screen.queryByText("Hana Novotná")).toBeNull())
    expect(screen.getByLabelText("Find an application")).toHaveValue("Draft")
  })

  it("shows an overpayment instead of what is left", async () => {
    renderPage({
      rows: [transaction("b1", { amountCents: 550000 })],
      candidates: [{ ...jana, terms: [term("t1", 1, 4900, 0, 5500)] }],
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

  it("does not send the old selection while the changed search is still waiting", async () => {
    const calls = renderPage({ rows: [transaction("b1")], candidates: [jana] })
    await userEvent.click(await screen.findByRole("button", { name: /^Assign/ }))
    await userEvent.type(screen.getByRole("textbox", { name: "Find an application" }), "Jana")
    await userEvent.click(await screen.findByRole("radio"))
    expect(screen.getByRole("radio")).toBeChecked()

    // The text changes and Enter / the button come before the search of the new text settles.
    await userEvent.type(screen.getByRole("textbox", { name: "Find an application" }), "x")
    expect(screen.queryByRole("radio")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Assign payment" }))
    expect(calls.some((request) => request.url.endsWith("/match"))).toBe(false)
    expect(await screen.findByRole("alert")).toBeVisible()
  })

  it("does not take the term of the symbol for another application the search finds", async () => {
    const other = { ...two, id: "a34", number: 34 }
    const calls = renderPage({
      rows: [transaction("b1", { variableSymbol: "12002", reason: "UNKNOWN_VARIABLE_SYMBOL" })],
      candidates: [other],
    })
    await userEvent.click(await screen.findByRole("button", { name: /^Assign/ }))
    await userEvent.type(screen.getByLabelText("Find an application"), "Jana")
    for (const radio of await screen.findAllByRole("radio")) expect(radio).not.toBeChecked()
    await userEvent.click(screen.getByRole("button", { name: "Assign payment" }))
    expect(await screen.findByRole("alert")).toBeVisible()
    expect(calls.some((request) => request.url.endsWith("/match"))).toBe(false)
  })

  it("retries a failed search with the typed text kept and without sending the form", async () => {
    const calls = renderPage({ rows: [transaction("b1")], candidates: [two], searchFailures: 1 })
    await userEvent.click(await screen.findByRole("button", { name: /^Assign/ }))
    await userEvent.type(screen.getByLabelText("Find an application"), "Jana")
    const alert = await screen.findByRole("alert")
    expect(within(alert).getByText("The applications could not be loaded")).toBeVisible()

    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }))
    expect(await screen.findAllByRole("radio")).toHaveLength(2)
    expect(screen.getByRole("textbox", { name: "Find an application" })).toHaveValue("Jana")
    // No "pick a term" error and no match request: the retry button does not submit the form.
    expect(screen.queryByRole("alert")).toBeNull()
    expect(calls.some((request) => request.url.endsWith("/match"))).toBe(false)
  })

  it("sends nothing while a failed refresh hides the chosen term", async () => {
    let isSearchDown = false
    const calls = renderPage({
      rows: [transaction("b1")],
      candidates: [two],
      isSearchDown: () => isSearchDown,
    })
    await userEvent.click(await screen.findByRole("button", { name: /^Assign/ }))
    await userEvent.type(screen.getByLabelText("Find an application"), "Jana")
    await userEvent.click((await screen.findAllByRole("radio"))[1]!)

    // The organizer comes back to the tab and the results cannot be refreshed.
    isSearchDown = true
    focusManager.setFocused(false)
    focusManager.setFocused(true)
    const alert = await screen.findByRole("alert")
    expect(screen.queryByRole("radio")).toBeNull()
    expect(screen.queryByText("After saving")).toBeNull()
    const submit = screen.getByRole("button", { name: "Assign payment" })
    expect(submit).toBeDisabled()
    await userEvent.type(screen.getByLabelText("Find an application"), "{Enter}")
    expect(calls.some((request) => request.url.endsWith("/match"))).toBe(false)

    // Once the term is on screen again, it can be assigned.
    isSearchDown = false
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }))
    expect((await screen.findAllByRole("radio"))[1]).toBeChecked()
    await userEvent.click(submit)
    await waitFor(() => expect(calls.some((request) => request.url.endsWith("/match"))).toBe(true))
  })
})
