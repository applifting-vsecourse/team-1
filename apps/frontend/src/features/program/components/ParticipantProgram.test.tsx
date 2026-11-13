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

import { ParticipantProgram } from "@/features/program/components/ParticipantProgram"

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()

const term = (id: string, name: string, startsOn: string, blocks: unknown[]) => ({
  termId: id,
  termName: name,
  startsOn,
  endsOn: "2027-07-18",
  blocks,
})
const block = {
  id: "b1",
  date: "2027-07-13",
  startTime: "10:00",
  endTime: "12:00",
  name: "Dílny",
  place: "Chata A–C",
  description: "Výroba suvenýrů a hudební dílna",
}

function renderPage(terms: unknown[]) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({ participantName: "Jana Nováková", eventName: "Letní kemp", terms }),
      { headers: { "Content-Type": "application/json" } },
    ),
  )
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <ParticipantProgram applicationId="a1" />,
  })
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/participant/applications/$applicationId",
    component: () => <p>Application detail</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([page, detail]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe("ParticipantProgram", () => {
  it("shows the days with a block and opens a description", async () => {
    renderPage([term("t1", "Letní týden", "2027-07-12", [block])])
    expect(await screen.findByText("Dílny")).toBeInTheDocument()
    expect(screen.getByText("10:00–12:00")).toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    const toggle = screen.getByRole("button", { name: /Show description/ })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(toggle)
    expect(screen.getByRole("button", { name: /Hide description/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  it("switches between several terms", async () => {
    renderPage([
      term("t1", "První týden", "2027-07-12", [block]),
      term("t2", "Druhý týden", "2027-07-19", []),
    ])
    expect(await screen.findByText("Dílny")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("combobox", { name: "Term" }))
    await userEvent.click(await screen.findByRole("option", { name: /Druhý týden/ }))
    expect(await screen.findByText("The program is not published yet.")).toBeInTheDocument()
    expect(screen.queryByText("Dílny")).not.toBeInTheDocument()
  })

  it("says the program is not published when there is no confirmed term", async () => {
    renderPage([])
    expect(await screen.findByText("The program is not published yet.")).toBeInTheDocument()
  })
})
