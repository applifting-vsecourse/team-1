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
  evaluationModePending: false,
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
  evaluationModePending: false,
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
  // Figma F5 (15376:2): date tile, name, „organization · dates · place“, tonal badge, occupancy with a bar.
  it("shows each event as a row with its terms, status and occupancy", async () => {
    renderList([{ ...event, location: "Lipno nad Vltavou" }])

    const row = (await screen.findByRole("heading", { name: "Letní kemp Lipno 2027" })).closest(
      "a",
    ) as HTMLElement
    expect(within(row).getByText("Published")).toHaveAttribute("data-variant", "success")
    expect(
      // One organization: its name would repeat on every row, so the row leaves it out.
      within(row).getByText("2 terms · July 2027 · Lipno nad Vltavou"),
    ).toBeInTheDocument()
    expect(row.querySelector('[data-slot="date-tile"]')).toHaveTextContent("12")
    expect(within(row).getByText("79 / 120")).toHaveClass("tabular-nums")
    expect(within(row).getByText("confirmed")).toHaveClass("text-muted-foreground")
    expect(within(row).getByRole("progressbar", { name: "79/120 confirmed" })).toBeInTheDocument()
  })

  // Every bar is as long as the others: the cell has a fixed width and the bar spans all of it,
  // whatever the count says (152 / 160 or 18 / 24); without a term only the dash, in the same cell.
  it("draws every occupancy bar across the same fixed-width cell", async () => {
    renderList([event, draft])

    await screen.findByRole("heading", { name: event.name })
    const cells = document.querySelectorAll('[data-slot="occupancy"]')
    expect(cells).toHaveLength(2)
    for (const cell of cells) expect(cell).toHaveClass("w-full", "lg:w-50", "lg:shrink-0")
    expect(screen.getByRole("progressbar", { name: "79/120 confirmed" })).toHaveClass(
      "h-1",
      "w-full",
    )
    const empty = screen
      .getByRole("heading", { name: draft.name })
      .closest("a")
      ?.querySelector('[data-slot="occupancy"]')
    expect(empty).toHaveTextContent("—")
    expect(empty?.querySelector('[role="progressbar"]')).toBeNull()
  })

  it("has one primary action in the header and the status as a segment", async () => {
    renderList([event])

    const status = await screen.findByRole("radiogroup", { name: "Event status" })
    expect(screen.getByRole("heading", { level: 1, name: "Events" })).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "Create event" })).toHaveLength(1)
    expect(
      within(status)
        .getAllByRole("radio")
        .map((radio) => radio.textContent),
    ).toEqual(["All", "Open", "Inactive"])
    expect(within(status).getByRole("radio", { name: "All" })).toBeChecked()
    // One organization: nothing to filter by, so no organization filter (and no „Filters“ on a phone).
    expect(screen.queryByRole("combobox", { name: "Organization" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Filters/ })).not.toBeInTheDocument()
  })

  it("offers the organization filter to an organizer in more than one organization", async () => {
    renderList([event, { ...draft, organizationId: "o2", organizationName: "Summit Events" }])
    // The organization select has no label above it; it names itself.
    expect(await screen.findByRole("combobox", { name: "Organization" })).toHaveTextContent(
      "All organizations",
    )
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument()
    // Several organizations: each row says whose event it is.
    const row = screen.getByRole("heading", { name: event.name }).closest("a") as HTMLElement
    expect(within(row).getByText(/^Kemp Lipno · /)).toBeInTheDocument()
  })

  it("filters the events by status", async () => {
    const user = userEvent.setup()
    renderList([event, draft])
    const status = await screen.findByRole("radiogroup", { name: "Event status" })

    await user.click(within(status).getByRole("radio", { name: "Inactive" }))
    expect(screen.queryByRole("heading", { name: event.name })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: draft.name })).toBeInTheDocument()

    await user.click(within(status).getByRole("radio", { name: "Open" }))
    expect(screen.getByRole("heading", { name: event.name })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: draft.name })).not.toBeInTheDocument()
  })

  it("highlights the event that was just created and says it has no term yet", async () => {
    renderList([event, draft], "e2")

    const item = (await screen.findByRole("heading", { name: "Jarní víkend Lipno 2027" })).closest(
      "li",
    )
    expect(item).toHaveAttribute("data-created", "true")
    expect(within(item as HTMLElement).getByText("No term yet")).toBeInTheDocument()
    expect(item?.querySelector('[data-slot="date-tile"]')).toBeNull()
    expect(within(item as HTMLElement).getByText("—", { selector: "[aria-hidden]" })).toBeVisible()
    expect(within(item as HTMLElement).queryByRole("progressbar")).not.toBeInTheDocument()
    expect(within(item as HTMLElement).getByText("Application inactive")).toBeInTheDocument()
  })

  // Figma F5 (15376:300): the filtered list leaves the organization out of the row meta.
  it("filters by organization, drops it from the rows and clears it while keeping the search", async () => {
    const user = userEvent.setup()
    renderList([event, { ...draft, organizationId: "o2", organizationName: "Summit Events" }])
    const organization = await screen.findByRole("combobox", { name: "Organization" })
    await user.click(organization)
    await user.click(screen.getByRole("option", { name: "Summit Events" }))
    expect(screen.queryByRole("heading", { name: event.name })).not.toBeInTheDocument()
    expect(screen.getByText("No term yet")).toBeInTheDocument()
    expect(screen.queryByText(/Summit Events ·/)).not.toBeInTheDocument()
    const search = screen.getByRole("searchbox")
    await user.type(search, "jarní")
    await user.click(screen.getByRole("button", { name: "Clear filter" }))
    expect(search).toHaveValue("jarní")
    expect(screen.getByText("Summit Events · No term yet")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Clear filter" })).not.toBeInTheDocument()
  })

  // Navigation A (Figma 15376:98, 15376:244, 15376:361): below lg the organization is in the „Filters“
  // bottom sheet next to the status segment, applies at once and shows as a removable chip.
  it("filters by organization in the bottom sheet and removes it with the chip", async () => {
    const user = userEvent.setup()
    renderList([event, { ...draft, organizationId: "o2", organizationName: "Summit Events" }])
    const filters = await screen.findByRole("button", { name: "Filters" })
    expect(filters).toHaveClass("lg:hidden")
    expect(screen.getByRole("radiogroup", { name: "Event status" }).parentElement).toHaveClass(
      "overflow-x-auto",
    )

    await user.click(filters)
    const sheet = await screen.findByRole("dialog", { name: "Filters" })
    expect(within(sheet).getByRole("radio", { name: "All organizations" })).toBeChecked()
    await user.click(within(sheet).getByRole("radio", { name: "Summit Events" }))
    expect(screen.queryByRole("heading", { name: event.name })).not.toBeInTheDocument()
    await user.click(within(sheet).getByRole("button", { name: "Close filters" }))

    expect(await screen.findByRole("button", { name: "Filters (1)" })).toBeInTheDocument()
    const applied = screen.getByRole("group", { name: "Applied filters" })
    await user.click(within(applied).getByRole("button", { name: "Remove filter Summit Events" }))
    expect(screen.getByRole("heading", { name: event.name })).toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Applied filters" })).not.toBeInTheDocument()
  })

  it("narrows the list by name", async () => {
    renderList([event, draft])

    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Search event name" }),
      "jarní",
    )

    expect(screen.getByRole("heading", { name: "Jarní víkend Lipno 2027" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Letní kemp Lipno 2027" })).not.toBeInTheDocument()
  })

  // Figma F5 (27777:148660): first run is the illustration, one sentence and one CTA; no header button.
  it("shows the first run with one call to action and no button in the header", async () => {
    renderList([])

    expect(await screen.findByRole("heading", { name: "There are no events yet." })).toBeVisible()
    expect(screen.getAllByRole("link", { name: "Create event" })).toHaveLength(1)
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
  })
})
