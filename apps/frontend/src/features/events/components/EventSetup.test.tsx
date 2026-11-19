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

import { notify } from "@/lib/notify"

import { EventSetup } from "@/features/events/components/EventSetup"

const base = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Kemp Lipno",
  organizationContactEmail: null,
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
  cancellationTerms: null,
  evaluationModeLocked: false,
  hasApplications: false,
  missing: ["TERM", "ROOM", "EVALUATION_MODE"],
  evaluationModePending: true,
  terms: [],
}

function renderSetup(
  event: object,
  deleteResponse?: () => Response,
  onPatch?: (body: unknown) => void,
) {
  const json = { headers: { "Content-Type": "application/json" } }
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const method = input instanceof Request ? input.method : (init?.method ?? "GET")
    if (method === "DELETE" && deleteResponse) return deleteResponse()
    if (method === "PATCH") {
      onPatch?.(
        input instanceof Request
          ? await input.clone().json()
          : JSON.parse(typeof init?.body === "string" ? init.body : "null"),
      )
      return new Response(JSON.stringify({ ...event, evaluationModePending: false }), json)
    }
    return new Response(JSON.stringify(event), json)
  })
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <EventSetup eventId="e1" />,
  })
  const events = createRoute({
    getParentRoute: () => root,
    path: "/organizer/events",
    component: () => <p>Events list</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([page, events]),
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
  it("shows what is missing without offering a copy action", async () => {
    renderSetup(base)

    expect(
      await screen.findByRole("heading", { name: "What is missing to open applications" }),
    ).toBeInTheDocument()
    expect(screen.getByText("0 of 3 done")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Add at least one term with a price" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Add at least one room to every term" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Copy/ })).not.toBeInTheDocument()
  })

  it("keeps a single primary button: the first step to do", async () => {
    renderSetup(base)

    const addTerm = await screen.findByRole("link", { name: "Add a term and price" })
    expect(addTerm.className).toContain("bg-primary")
    expect(screen.getByRole("link", { name: "Add a room" }).className).not.toContain("bg-primary")
  })

  it("counts the finished step and drops its button", async () => {
    renderSetup({ ...base, termCount: 1, missing: ["ROOM", "EVALUATION_MODE"] })

    expect(await screen.findByText("1 of 3 done")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Add a term and price" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Add a room" }).className).toContain("bg-primary")
  })

  it("copies the application URL using the icon next to the link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    const success = vi.spyOn(notify, "success")
    renderSetup({
      ...base,
      termCount: 2,
      applicationsOpen: true,
      evaluationModePending: false,
      missing: [],
    })

    const icon = await screen.findByRole("button", { name: "Copy link" })
    const link = screen.getByRole("link", { name: `${window.location.origin}/apply/tok123` })
    expect(icon.parentElement).toBe(link.parentElement)
    expect(screen.getAllByRole("button", { name: /Copy/ })).toHaveLength(1)
    await userEvent.click(icon)

    expect(writeText).toHaveBeenCalledWith(link.getAttribute("href"))
    expect(success).toHaveBeenCalledWith("Link copied to the clipboard")
  })

  it("offers both modes in the third step with nothing preselected and the button off", async () => {
    renderSetup(base)

    expect(
      await screen.findByRole("heading", { name: "Choose the evaluation mode" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Automatic" })).not.toBeChecked()
    expect(screen.getByRole("radio", { name: "Manual" })).not.toBeChecked()
    expect(screen.getByRole("radio", { name: "Automatic" })).toHaveAccessibleDescription(
      /A freed bed goes to the first substitute/,
    )
    expect(screen.getByRole("radio", { name: "Manual" })).toHaveAccessibleDescription(
      /confirm it, add it to the substitutes or reject it/,
    )
    expect(screen.getByRole("button", { name: "Confirm mode" })).toBeDisabled()
    // The row above the checklist is gone; the step replaces it.
    expect(screen.queryByText("Evaluation mode")).not.toBeInTheDocument()
  })

  it("makes the confirm button primary only while it is the first step to do", async () => {
    renderSetup(base)
    expect((await screen.findByRole("button", { name: "Confirm mode" })).className).not.toContain(
      "bg-primary",
    )
  })

  it("saves the chosen mode and confirms with a toast", async () => {
    const success = vi.spyOn(notify, "success")
    const patches: unknown[] = []
    renderSetup({ ...base, termCount: 1, missing: ["EVALUATION_MODE"] }, undefined, (body) =>
      patches.push(body),
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole("radio", { name: "Manual" }))
    await user.click(screen.getByRole("button", { name: "Confirm mode" }))

    await vi.waitFor(() => expect(patches).toEqual([{ evaluationMode: "MANUAL" }]))
    await vi.waitFor(() => expect(success).toHaveBeenCalledWith("Evaluation mode saved."))
  })

  it("shows the chosen mode as a done step with a link to change it", async () => {
    renderSetup({ ...base, evaluationModePending: false, missing: ["TERM", "ROOM"] })

    expect(await screen.findByText("1 of 3 done")).toBeInTheDocument()
    expect(screen.getByText("Evaluation mode: Automatic")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Change" })).toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("shows a locked mode without the change link", async () => {
    renderSetup({
      ...base,
      evaluationMode: "MANUAL",
      evaluationModePending: false,
      evaluationModeLocked: true,
      missing: ["ROOM"],
    })
    expect(await screen.findByText("Evaluation mode: Manual")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Change" })).not.toBeInTheDocument()
  })
})
