import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CancellationTermsPage } from "@/features/events/components/CancellationTermsPage"

const event = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Kemp Lipno",
  name: "Jarní víkend Lipno 2027",
  description: null,
  location: null,
  contactEmail: null,
  contactPhone: null,
  publishedInCatalog: false,
  photoFileName: null,
  publicToken: "tok123",
  createdAt: "2027-01-01T10:00:00.000Z",
  termCount: 0,
  startsOn: null,
  endsOn: null,
  applicationsOpen: false,
  evaluationMode: "AUTOMATIC",
  cancellationStartsOn: null,
  cancellationTerms: null as string | null,
  evaluationModeLocked: false,
  hasApplications: false,
  missing: ["TERM", "ROOM"],
  terms: [],
}

function renderPage(current: typeof event) {
  const json = { headers: { "Content-Type": "application/json" } }
  const saved: unknown[] = []
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const request = input as Request
    if (request.method === "PUT") {
      const body = (await request.clone().json()) as { cancellationTerms: string }
      saved.push(body)
      return new Response(JSON.stringify({ ...current, ...body }), json)
    }
    return new Response(JSON.stringify(current), json)
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CancellationTermsPage eventId="e1" />
    </QueryClientProvider>,
  )
  return saved
}

describe("CancellationTermsPage", () => {
  afterEach(() => vi.restoreAllMocks())

  it("saves the written terms and shows the preview", async () => {
    const user = userEvent.setup()
    const saved = renderPage(event)

    await user.type(
      await screen.findByLabelText("Cancellation terms"),
      "Full refund before 30 days.",
    )
    await user.click(screen.getByRole("button", { name: "Save terms" }))

    expect(await screen.findByText("Cancellation terms preview")).toBeInTheDocument()
    expect(saved).toEqual([{ cancellationTerms: "Full refund before 30 days." }])
    expect(screen.getByRole("button", { name: "Edit terms" })).toBeInTheDocument()
  })

  it("asks for a text instead of saving an empty one", async () => {
    const user = userEvent.setup()
    const saved = renderPage(event)

    await user.click(await screen.findByRole("button", { name: "Save terms" }))

    expect(screen.getByText("Write the cancellation terms.")).toBeInTheDocument()
    expect(saved).toEqual([])
  })

  it("shows saved terms as a preview and returns to editing", async () => {
    const user = userEvent.setup()
    renderPage({ ...event, cancellationTerms: "First line.\nSecond line." })

    expect(await screen.findByText("First line.")).toBeInTheDocument()
    expect(screen.getByText("Second line.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Edit terms" }))
    expect(screen.getByLabelText("Cancellation terms")).toHaveValue("First line.\nSecond line.")
  })
})
