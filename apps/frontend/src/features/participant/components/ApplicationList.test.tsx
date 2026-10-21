import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MyApplication } from "@/features/participant/api/applications"
import { ApplicationList } from "@/features/participant/components/ApplicationList"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const application = (overrides: Partial<MyApplication> = {}): MyApplication => ({
  id: "a1",
  eventName: "Letní kemp 2027",
  firstName: "Jana",
  lastName: "Nováková",
  code: "LKL-0048",
  variableSymbol: "0048",
  terms: [
    {
      termId: "t1",
      name: "1. týden",
      startsOn: "2027-07-04",
      endsOn: "2027-07-10",
      status: "CONFIRMED",
      priceCzk: 4500,
    },
    {
      termId: "t2",
      name: "2. týden",
      startsOn: "2027-07-11",
      endsOn: "2027-07-17",
      status: "WAITLISTED",
      priceCzk: 4900,
    },
  ],
  amountDueCzk: 4500,
  amountPaidCzk: 0,
  amountOwedCzk: 4500,
  paymentStatus: "UNPAID",
  paymentDetails: { bankAccount: "2900123456/2010", variableSymbol: "0048" },
  ...overrides,
})

const renderList = () => {
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ApplicationList />
      </QueryClientProvider>
    ),
  })
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/participant/applications/$applicationId",
  })
  const router = createRouter({
    routeTree: root.addChildren([detail]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
}

const respondWith = (value: unknown) => get.mockReturnValue({ json: () => Promise.resolve(value) })

describe("ApplicationList", () => {
  beforeEach(() => get.mockReset())

  it("shows a loading state first", async () => {
    get.mockReturnValue({ json: () => new Promise(() => undefined) })
    renderList()

    expect(await screen.findByRole("status")).toBeInTheDocument()
  })

  it("says what would appear when there is no application", async () => {
    respondWith([])
    renderList()

    expect(await screen.findByText(/You have no applications yet/)).toBeInTheDocument()
  })

  it("shows the error with a way to retry", async () => {
    get.mockReturnValue({ json: () => Promise.reject(new Error("Boom")) })
    renderList()

    expect(await screen.findByText("Couldn't load your applications")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Try again|Retry/i })).toBeInTheDocument()
  })

  it("lists every application with its variable symbol, term statuses and a link to the detail", async () => {
    respondWith([
      application(),
      application({
        id: "a2",
        eventName: "Horský víkend 2027",
        variableSymbol: "0051",
        code: "HV-0051",
      }),
    ])
    renderList()

    expect(await screen.findByRole("heading", { name: "Letní kemp 2027" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Horský víkend 2027" })).toBeInTheDocument()
    expect(screen.getAllByText(/Jana Nováková · LKL-0048/)).toHaveLength(1)
    expect(screen.getByText(/Jana Nováková · HV-0051/)).toBeInTheDocument()
    expect(screen.getAllByText("4–10 Jul 2027")).toHaveLength(2)
    expect(screen.getAllByText("1. týden")).toHaveLength(2)
    expect(screen.getAllByText("Confirmed")).toHaveLength(2)
    expect(screen.getAllByText("Waiting for confirmation")).toHaveLength(2)
    expect(screen.getAllByText("Unpaid")).toHaveLength(2)
    expect(screen.queryByText(/in line|waitlist/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/participant/applications/a1")
  })
})
