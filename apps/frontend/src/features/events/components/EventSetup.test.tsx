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
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EventSetup } from "@/features/events/components/EventSetup"

const base = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Kemp Lipno",
  name: "Jarní víkend Lipno 2027",
  description: null,
  location: null,
  publicToken: "tok123",
  createdAt: "2027-01-01T10:00:00.000Z",
  termCount: 0,
  roomCount: 0,
  startsOn: null,
  endsOn: null,
  applicationsOpen: false,
  missing: ["TERM", "ROOM"],
  terms: [],
}

function renderSetup(event: object) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(event), { headers: { "Content-Type": "application/json" } }),
  )
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <EventSetup eventId="e1" />,
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe("EventSetup", () => {
  it("shows what is missing and keeps the copy button off", async () => {
    renderSetup(base)

    expect(
      await screen.findByRole("heading", { name: "What is missing to open applications" }),
    ).toBeInTheDocument()
    expect(screen.getByText("0 of 2 done")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Add at least one term with a price" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Add at least one room" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copy application link" })).toBeDisabled()
  })

  it("keeps a single primary button: the first step to do", async () => {
    renderSetup(base)

    const addTerm = await screen.findByRole("link", { name: "Add a term and price" })
    expect(addTerm.className).toContain("bg-primary")
    expect(screen.getByRole("link", { name: "Add a room" }).className).not.toContain("bg-primary")
  })

  it("counts the finished step and drops its button", async () => {
    renderSetup({ ...base, termCount: 1, missing: ["ROOM"] })

    expect(await screen.findByText("1 of 2 done")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Add a term and price" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Add a room" }).className).toContain("bg-primary")
  })

  it("copies the link of a ready event and confirms it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    const success = vi.spyOn(toast, "success")
    renderSetup({ ...base, termCount: 2, roomCount: 3, applicationsOpen: true, missing: [] })

    await userEvent.click(await screen.findByRole("button", { name: "Copy application link" }))

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/apply/tok123`)
    expect(await screen.findByRole("button", { name: "Copy again" })).toBeEnabled()
    expect(success).toHaveBeenCalledWith("Link copied to the clipboard")
  })
})
