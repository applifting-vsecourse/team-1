import { QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { ROUTES } from "@/app/routes"
import { queryClient } from "@/config/react-query"
import { Route } from "@/routes/organizer/_app/events/$eventId/applications_.$applicationId"

import type { PaymentApplication } from "@/features/event-overview/api/payments"
import type { TermStatusDetail } from "@/features/event-overview/api/termStatus"
import type { OrganizerMeals } from "@/features/meals/api/meals"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

const eventId = "e1"
const applicationId = "a1"
const participant = { firstName: "Eva", lastName: "Nováková", eventName: "Summer camp" }
const term: TermStatusDetail = {
  termId: "t1",
  name: "First term",
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  status: "CONFIRMED",
  priceCzk: 1000,
  owedCzk: 1000,
  debtCzk: 1000,
  confirmationExceedsCapacity: false,
  confirmationNextOccupied: 1,
  capacity: 50,
  occupied: 1,
  confirmationCapacity: 50,
  confirmationOccupied: 1,
  confirmationDueCzk: 1000,
  waitlistPosition: null,
  allowedStatuses: [],
  history: [],
  substituteRecords: [],
}
const application: PaymentApplication = {
  ...participant,
  id: applicationId,
  eventId,
  individualAccommodation: false,
  accommodationRequest: null,
  code: "APP-001",
  birthDate: "2011-05-04",
  gender: "FEMALE",
  email: "eva@example.com",
  phone: null,
  pronouns: null,
  isEditable: true,
  bankAccount: "123456789/0000",
  amountDueCzk: 1000,
  amountPaidCzk: 0,
  amountOwedCzk: 1000,
  payableCzk: 1000,
  refundableTermId: null,
  terms: [
    {
      termId: term.termId,
      termNumber: 1,
      name: term.name,
      variableSymbol: "1001",
      status: term.status,
      priceCzk: term.priceCzk,
      startsOn: term.startsOn,
      endsOn: term.endsOn,
      dueCzk: 1000,
      paidCzk: 0,
      owedCzk: 1000,
      refundableCzk: 0,
      paymentStatus: "UNPAID",
      paymentDueAt: null,
    },
  ],
  payments: [],
}
const meals: OrganizerMeals = {
  ...participant,
  applicationId,
  options: [],
  selectedOptionIds: [],
  allergies: null,
  specialRequest: null,
  noRestrictions: true,
  editable: true,
}

const paths = {
  payment: "organizer/applications/a1/payments",
  meals: "organizer/events/e1/meals/applications/a1",
  terms: "organizer/applications/a1/terms",
  history: "organizer/applications/a1/history",
}

function renderDetail(loadHistory: () => Promise<unknown>) {
  const dataByPath = new Map<string, unknown>([
    [paths.payment, application],
    [paths.meals, meals],
    [paths.terms, [term]],
    [`${paths.terms}/change-options`, []],
  ])
  get.mockImplementation((path: string) => ({
    json: path === paths.history ? loadHistory : () => Promise.resolve(dataByPath.get(path)),
  }))
  const root = createRootRoute()
  vi.spyOn(Route, "useParams").mockReturnValue({ eventId, applicationId })
  const detail = createRoute({
    getParentRoute: () => root,
    path: ROUTES.organizer.application,
    component: Route.options.component,
  })
  const router = createRouter({
    routeTree: root.addChildren([detail]),
    history: createMemoryHistory({ initialEntries: ["/organizer/events/e1/applications/a1"] }),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function requestCount(path: string) {
  return get.mock.calls.filter(([requestedPath]) => requestedPath === path).length
}

function expectOtherSections() {
  expect(screen.getByRole("heading", { name: "Eva Nováková" })).toBeVisible()
  expect(screen.getByRole("heading", { name: "Meals" })).toBeVisible()
  expect(screen.getByRole("heading", { name: "Status by term" })).toBeVisible()
}

beforeEach(() => {
  get.mockReset()
})
afterEach(() => {
  queryClient.clear()
  vi.restoreAllMocks()
})

it("shows one loading state and requests each section once on the first visit", async () => {
  const history = Promise.withResolvers<unknown>()
  renderDetail(() => history.promise)

  expect(await screen.findByText("Loading…")).toBeVisible()
  expect(screen.getAllByRole("status")).toHaveLength(1)
  expect(screen.queryByRole("heading", { name: "Eva Nováková" })).not.toBeInTheDocument()

  act(() => history.resolve([]))

  expect(await screen.findByRole("heading", { name: "History of changes" })).toBeVisible()
  expectOtherSections()
  expect(screen.queryByText("Loading…")).not.toBeInTheDocument()
  for (const path of Object.values(paths)) {
    expect(requestCount(path)).toBe(1)
  }
})

it("keeps the other sections usable when history fails and retries only on request", async () => {
  const retry = Promise.withResolvers<unknown>()
  const loadHistory = vi
    .fn<() => Promise<unknown>>()
    .mockRejectedValueOnce(new Error("History unavailable"))
    .mockImplementationOnce(() => retry.promise)
    .mockResolvedValue([])

  renderDetail(loadHistory)

  expect(await screen.findByText("History unavailable")).toBeVisible()
  expectOtherSections()
  expect(loadHistory).toHaveBeenCalledTimes(1)

  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: "Try again" }))
  expect(await screen.findByText("Loading…")).toBeVisible()
  expectOtherSections()

  act(() => retry.reject(new Error("History still unavailable")))

  expect(await screen.findByText("History still unavailable")).toBeVisible()
  expectOtherSections()
  expect(loadHistory).toHaveBeenCalledTimes(2)

  await user.click(screen.getByRole("button", { name: "Try again" }))

  expect(await screen.findByRole("heading", { name: "History of changes" })).toBeVisible()
  expectOtherSections()
  expect(loadHistory).toHaveBeenCalledTimes(3)
  expect(requestCount(paths.payment)).toBe(1)
  expect(requestCount(paths.meals)).toBe(1)
  expect(requestCount(paths.terms)).toBe(1)
})
