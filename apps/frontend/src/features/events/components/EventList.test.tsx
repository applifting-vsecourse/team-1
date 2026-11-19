import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EventList } from "@/features/events/components/EventList"

const event = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Kemp Lipno",
  organizationContactEmail: null,
  name: "Letní kemp Lipno 2027",
  description: null,
  location: null,
  contactEmail: null,
  contactPhone: null,
  publishedInCatalog: false,
  photoFileName: null,
  publicToken: "tok123",
  createdAt: "2027-01-01T10:00:00.000Z",
  termCount: 2,
  startsOn: "2027-07-12",
  endsOn: "2027-07-25",
  applicationsOpen: true,
  evaluationMode: "AUTOMATIC",
  cancellationStartsOn: null,
  cancellationTerms: null,
  evaluationModeLocked: true,
  hasApplications: false,
  missing: [],
  terms: [
    {
      id: "t1",
      name: "Letní turnus 1",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      roomMode: "GENDERED",
      roomCount: 2,
      capacity: 60,
      confirmedCount: 48,
    },
    {
      id: "t2",
      name: "Letní turnus 2",
      startsOn: "2027-07-19",
      endsOn: "2027-07-25",
      roomMode: "GENDERED",
      roomCount: 2,
      capacity: 60,
      confirmedCount: 31,
    },
  ],
}

const draft = {
  ...event,
  id: "e2",
  name: "Jarní víkend Lipno 2027",
  termCount: 0,
  startsOn: null,
  endsOn: null,
  applicationsOpen: false,
  evaluationMode: "AUTOMATIC",
  cancellationStartsOn: null,
  cancellationTerms: null,
  evaluationModeLocked: false,
  hasApplications: false,
  missing: ["TERM", "ROOM"],
  terms: [],
}

function renderList(events: object[], createdEventId?: string) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(events), { headers: { "Content-Type": "application/json" } }),
  )
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <EventList createdEventId={createdEventId} />,
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

describe("EventList", () => {
  it("shows each event as a row with its terms, status and occupancy", async () => {
    renderList([event])

    const card = (await screen.findByRole("heading", { name: "Letní kemp Lipno 2027" })).closest(
      "a",
    ) as HTMLElement
    expect(within(card).getByText("Published")).toBeInTheDocument()
    expect(within(card).getByText("2 terms · July 2027 · Kemp Lipno")).toBeInTheDocument()
    expect(within(card).getByText("79 / 120 places in 2 terms")).toBeInTheDocument()
    expect(
      within(card).getByRole("progressbar", { name: "79 / 120 places in 2 terms" }),
    ).toBeInTheDocument()
  })

  it("highlights the event that was just created and says it has no term yet", async () => {
    renderList([event, draft], "e2")

    const item = (await screen.findByRole("heading", { name: "Jarní víkend Lipno 2027" })).closest(
      "li",
    )
    expect(item).toHaveAttribute("data-created", "true")
    expect(within(item as HTMLElement).getByText("No term yet · Kemp Lipno")).toBeInTheDocument()
    expect(within(item as HTMLElement).queryByRole("progressbar")).not.toBeInTheDocument()
    expect(within(item as HTMLElement).getByText("Application inactive")).toBeInTheDocument()
  })

  it("clears the organization filter while keeping the name search", async () => {
    const user = userEvent.setup()
    renderList([event, { ...draft, organizationId: "o2", organizationName: "Summit Events" }])
    const organization = await screen.findByRole("combobox", { name: "Organization" })
    await user.click(organization)
    await user.click(screen.getByRole("option", { name: "Summit Events" }))
    expect(screen.queryByRole("heading", { name: event.name })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("1 event · Summit Events")
    const search = screen.getByRole("searchbox")
    await user.type(search, "jarní")
    await user.click(screen.getByRole("button", { name: "Clear filter" }))
    expect(search).toHaveValue("jarní")
    expect(screen.getByRole("heading", { name: /1 event.*1 organization/ })).toBeVisible()
    expect(screen.queryByRole("button", { name: "Clear filter" })).not.toBeInTheDocument()
  })

  it("narrows the list by name", async () => {
    renderList([event, draft])

    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Search event name" }),
      "jarní",
    )

    expect(screen.getByRole("heading", { name: "Jarní víkend Lipno 2027" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Letní kemp Lipno 2027" })).not.toBeInTheDocument()
    expect(screen.getByText("1 event")).toBeInTheDocument()
  })
})
