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
  it("shows the setup steps without offering a copy action", async () => {
    renderSetup(base)

    expect(
      await screen.findByRole("heading", { name: "Done: 0 / 3 · Application setup" }),
    ).toBeInTheDocument()
    expect(screen.getByText("The event is created")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Now · 1. Term and price" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Next · 2. Capacity" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Next · 3. Evaluation mode" })).toBeInTheDocument()
    expect(screen.getByText("1. Term").closest("li")).toHaveAttribute("aria-current", "step")
    expect(screen.queryByRole("button", { name: /Copy/ })).not.toBeInTheDocument()
  })

  it("offers one action: the step to do now", async () => {
    renderSetup(base)

    const addTerm = await screen.findByRole("link", { name: "Add a term and price" })
    expect(addTerm.className).toContain("bg-primary")
    expect(screen.queryByRole("link", { name: "Set capacity" })).not.toBeInTheDocument()
  })

  it("marks the finished step done and moves on to the capacity", async () => {
    renderSetup({ ...base, termCount: 1, missing: ["ROOM", "EVALUATION_MODE"] })

    expect(
      await screen.findByRole("heading", { name: "Done: 1 / 3 · Capacity setup" }),
    ).toBeInTheDocument()
    expect(screen.getByText("The term and price are saved")).toBeInTheDocument()
    expect(screen.getByText("Done")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Add a term and price" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Set capacity" }).className).toContain("bg-primary")
  })

  it("copies the application URL shown in the read-only field", async () => {
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

    const field = await screen.findByRole("textbox", { name: "The application is available" })
    const link = `${window.location.origin}/apply/tok123`
    expect(field).toHaveValue(link.replace(/^https?:\/\//, ""))
    expect(screen.getByRole("link", { name: "Open page" })).toHaveAttribute("href", link)
    expect(screen.getAllByRole("button", { name: /Copy/ })).toHaveLength(1)
    await userEvent.click(screen.getByRole("button", { name: "Copy link" }))

    expect(writeText).toHaveBeenCalledWith(link)
    expect(success).toHaveBeenCalledWith("Link copied to the clipboard")
    expect(screen.getByText("The link is on the clipboard.")).toBeVisible()
  })

  it("offers both modes in the third step with nothing preselected and the button off", async () => {
    renderSetup({ ...base, termCount: 1, missing: ["EVALUATION_MODE"] })

    expect(
      await screen.findByRole("heading", { name: "Done: 2 / 3 · Evaluation mode" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Automatic" })).not.toBeChecked()
    expect(screen.getByRole("radio", { name: "Manual" })).not.toBeChecked()
    expect(screen.getByRole("radio", { name: "Automatic" })).toHaveAccessibleDescription(
      /A freed bed goes to the first substitute/,
    )
    expect(screen.getByRole("radio", { name: "Manual" })).toHaveAccessibleDescription(
      /confirm it, add it to the substitutes or reject it/,
    )
    expect(screen.getByRole("button", { name: "Confirm evaluation mode" })).toBeDisabled()
    // The row above the stepper is gone; the step replaces it.
    expect(screen.queryByText("Evaluation mode:")).not.toBeInTheDocument()
  })

  it("shows the mode form only once it is the step to do now", async () => {
    renderSetup(base)

    expect(await screen.findByRole("link", { name: "Add a term and price" })).toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("saves the chosen mode and confirms with a toast", async () => {
    const success = vi.spyOn(notify, "success")
    const patches: unknown[] = []
    renderSetup({ ...base, termCount: 1, missing: ["EVALUATION_MODE"] }, undefined, (body) =>
      patches.push(body),
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole("radio", { name: "Manual" }))
    await user.click(screen.getByRole("button", { name: "Confirm evaluation mode" }))

    await vi.waitFor(() => expect(patches).toEqual([{ evaluationMode: "MANUAL" }]))
    await vi.waitFor(() => expect(success).toHaveBeenCalledWith("Evaluation mode saved."))
  })

  it("shows the chosen mode as a done step with a link to change it", async () => {
    renderSetup({ ...base, evaluationModePending: false, missing: ["TERM", "ROOM"] })

    expect(
      await screen.findByRole("heading", { name: "Done: 1 / 3 · Application setup" }),
    ).toBeInTheDocument()
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
