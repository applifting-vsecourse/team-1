import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ROUTES } from "@/app/routes"
import { Route } from "@/routes/organizer/_app/events/$eventId/applications"

import {
  applicationsSearchSchema,
  type ApplicationsSearch,
} from "@/features/event-overview/lib/applications-search"
import {
  readApplicationsSearch,
  saveApplicationsSearch,
} from "@/features/event-overview/lib/applications-search-session"

vi.mock("@/features/event-overview/components/ApplicationsPage", () => ({
  ApplicationsPage: ({
    filters,
    onFiltersChange,
  }: {
    filters: ApplicationsSearch
    onFiltersChange: (filters: ApplicationsSearch) => void
  }) => (
    <>
      <output aria-label="Filters">{JSON.stringify(filters)}</output>
      <button onClick={() => onFiltersChange({ q: "Jana", term: "t1", payment: "UNPAID" })}>
        Apply filters
      </button>
      <button onClick={() => onFiltersChange({})}>Clear filters</button>
    </>
  ),
}))

function setup(entry = "/organizer/events/e1/applications") {
  const root = createRootRouteWithContext<{ queryClient: QueryClient }>()()
  const organizer = createRoute({ getParentRoute: () => root, path: "/organizer" })
  const app = createRoute({ getParentRoute: () => organizer, id: "_app" })
  const event = createRoute({ getParentRoute: () => app, path: "/events/$eventId" })
  const overview = createRoute({
    getParentRoute: () => event,
    path: "/",
    component: () => <h1>Overview</h1>,
  })
  const applications = createRoute({
    getParentRoute: () => event,
    path: "/applications",
    validateSearch: applicationsSearchSchema,
    beforeLoad: Route.options.beforeLoad as (context: {
      params: { eventId: string }
      search: ApplicationsSearch
      preload: boolean
    }) => void,
    component: Route.options.component,
  })
  const router = createRouter({
    routeTree: root.addChildren([
      organizer.addChildren([app.addChildren([event.addChildren([overview, applications])])]),
    ]),
    history: createMemoryHistory({ initialEntries: [entry] }),
    context: { queryClient: new QueryClient() },
  })
  render(<RouterProvider router={router} />)
  return router
}

async function expectFilters(filters: ApplicationsSearch) {
  expect(await screen.findByLabelText("Filters")).toHaveTextContent(JSON.stringify(filters))
}

beforeEach(() => {
  sessionStorage.clear()
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("applications filter navigation", () => {
  it("restores filters and the URL after visiting another event section", async () => {
    const router = setup()
    await userEvent.click(await screen.findByRole("button", { name: "Apply filters" }))
    await expectFilters({ q: "Jana", term: "t1", payment: "UNPAID" })
    await act(() => router.navigate({ to: ROUTES.organizer.event, params: { eventId: "e1" } }))
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument()
    await act(() => router.navigate({ to: ROUTES.organizer.eventApplications, params: { eventId: "e1" } }))
    await expectFilters({ q: "Jana", term: "t1", payment: "UNPAID" })
    expect(router.state.location.search).toEqual({ q: "Jana", term: "t1", payment: "UNPAID" })
  })

  it("preserves filters when reopening the current URL", async () => {
    const router = setup("/organizer/events/e1/applications?term=t1&payment=UNPAID")
    await expectFilters({ term: "t1", payment: "UNPAID" })
    const url = router.state.location.href
    cleanup()
    setup(url)
    await expectFilters({ term: "t1", payment: "UNPAID" })
  })

  it("does not apply another event's filters", async () => {
    saveApplicationsSearch("e1", { payment: "UNPAID" })
    const router = setup()
    await expectFilters({ payment: "UNPAID" })
    await act(() => router.navigate({ to: ROUTES.organizer.eventApplications, params: { eventId: "e2" } }))
    await expectFilters({})
    expect(readApplicationsSearch("e1")).toEqual({ payment: "UNPAID" })
  })

  it("uses URL filters instead of merging in saved filters", async () => {
    saveApplicationsSearch("e1", { q: "Jana", term: "t1", payment: "UNPAID" })
    setup("/organizer/events/e1/applications?status=WAITLISTED&gender=MALE")
    await expectFilters({ status: "WAITLISTED", gender: "MALE" })
    expect(readApplicationsSearch("e1")).toEqual({ status: "WAITLISTED", gender: "MALE" })
  })

  it("does not restore cleared filters after navigation or a refresh", async () => {
    saveApplicationsSearch("e1", { payment: "UNPAID" })
    const router = setup()
    await expectFilters({ payment: "UNPAID" })
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    await expectFilters({})
    await act(() => router.navigate({ to: ROUTES.organizer.event, params: { eventId: "e1" } }))
    await act(() => router.navigate({ to: ROUTES.organizer.eventApplications, params: { eventId: "e1" } }))
    await expectFilters({})
    cleanup()
    setup()
    await expectFilters({})
  })

  it("does not overwrite saved filters when preloading a link", async () => {
    const router = setup("/organizer/events/e1/")
    await screen.findByRole("heading", { name: "Overview" })
    saveApplicationsSearch("e1", { payment: "UNPAID" })
    await act(() => router.preloadRoute({
      to: ROUTES.organizer.eventApplications,
      params: { eventId: "e1" },
      search: { payment: "PAID" },
    }))
    expect(readApplicationsSearch("e1")).toEqual({ payment: "UNPAID" })
    await act(() => router.navigate({
      to: ROUTES.organizer.eventApplications,
      params: { eventId: "e1" },
      search: { payment: "PAID" },
    }))
    await expectFilters({ payment: "PAID" })
    expect(readApplicationsSearch("e1")).toEqual({ payment: "PAID" })
  })
})
