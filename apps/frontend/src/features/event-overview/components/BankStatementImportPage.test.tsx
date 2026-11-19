import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BankStatementImportPage } from "@/features/event-overview/components/BankStatementImportPage"

const unmatched = {
  transactions: [
    {
      id: "b1",
      bookedOn: "2026-05-05",
      amountCents: 144350,
      currency: "CZK",
      variableSymbol: null,
      counterpartyName: "Hana Novotná",
      message: "Camp",
      reason: "NO_VARIABLE_SYMBOL",
      applicationId: null,
      applicantName: null,
    },
    {
      id: "b2",
      bookedOn: "2026-05-06",
      amountCents: 10000,
      currency: "EUR",
      variableSymbol: "12002",
      counterpartyName: null,
      message: null,
      reason: "UNSUPPORTED_CURRENCY",
      applicationId: "a1",
      applicantName: "Jana Nováková",
    },
  ],
}
const importResult = {
  matchedCount: 2,
  matchedCzk: 7000,
  unmatchedCount: 2,
  unmatchedCzk: 300,
  overpaidCount: 1,
  overpaidCzk: 100,
  duplicateCount: 3,
  ignoredCount: 1,
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

function renderPage(upload: Response = json(importResult)) {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const request = new Request(input, init)
    return Promise.resolve(request.method === "POST" ? upload : json(unmatched))
  })
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <BankStatementImportPage
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
  return fetchMock
}

const csv = new File(["ID operace;Datum;Objem;VS"], "vypis.csv", { type: "text/csv" })

afterEach(() => vi.restoreAllMocks())

describe("BankStatementImportPage", () => {
  it("lists the unmatched payments with the reason and links the application when known", async () => {
    renderPage()
    const row = (await screen.findByText("Hana Novotná")).closest("tr")!
    expect(row).toHaveTextContent("No variable symbol")
    expect(screen.getByText("The currency is not CZK")).toBeVisible()
    expect(screen.getByText(/€100\.00/)).toBeVisible()
    expect(screen.getByText(/1,443\.50/)).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Detail Jana Nováková" }).getAttribute("href"),
    ).toContain("/organizer/events/e1/applications/a1")
  })

  it("shows the summary after the upload: matched, unmatched, overpayments, skipped duplicates", async () => {
    const fetchMock = renderPage()
    await screen.findByText("Hana Novotná")
    await userEvent.upload(screen.getByTestId("upload-input"), csv)
    expect(await screen.findByText("Matched")).toBeVisible()
    expect(screen.getByText("Unmatched")).toBeVisible()
    expect(screen.getByText("Overpayments")).toBeVisible()
    expect(screen.getByText(/7,000/)).toBeVisible()
    expect(screen.getByText(/3 transactions were already imported/)).toBeVisible()
    expect(screen.getByText(/1 outgoing transaction was skipped/)).toBeVisible()
    const post = fetchMock.mock.calls
      .map(([input]) => input)
      .find((input): input is Request => input instanceof Request && input.method === "POST")
    expect(post?.url).toContain("/organizer/events/e1/bank-statements")
    expect(post?.headers.get("Content-Type")).toBe("text/csv")
  })

  it("shows the translated error when the file is not a statement", async () => {
    renderPage(json({ statusCode: 400, code: "BANK_STATEMENT_INVALID", message: "Invalid" }, 400))
    await screen.findByText("Hana Novotná")
    await userEvent.upload(screen.getByTestId("upload-input"), csv)
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/not a supported bank statement/),
    )
  })
})
