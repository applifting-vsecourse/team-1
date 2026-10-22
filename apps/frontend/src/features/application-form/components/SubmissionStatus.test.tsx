import { Suspense } from "react"
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

import type { SubmissionStatus as Data } from "@/features/application-form/api/submissionStatus"
import { SubmissionStatus } from "@/features/application-form/components/SubmissionStatus"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const term = (id: string, status: "CONFIRMED" | "WAITLISTED", start: string, end: string) => ({
  termId: id,
  name: id,
  startsOn: start,
  endsOn: end,
  status,
  priceCzk: 6900,
})
const jana = (status: "CONFIRMED" | "WAITLISTED" = "CONFIRMED") => ({
  firstName: "Jana",
  lastName: "Nováková",
  code: "LK-0048",
  variableSymbol: "0048",
  terms: [term("t1", status, "2027-07-12", "2027-07-18")],
})

const data = (overrides: Partial<Data> = {}): Data => ({
  eventName: "Letní kemp 2027",
  email: "jana@example.com",
  isNewAccount: true,
  applications: [jana()],
  payment: {
    amountCzk: 6900,
    bankAccount: "123456789/0800",
    variableSymbol: "0048",
    parts: [{ firstName: "Jana", amountCzk: 6900 }],
  },
  ...overrides,
})

const renderStatus = async (value: Data) => {
  get.mockReturnValue({ json: () => Promise.resolve(value) })
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <Suspense>
          <SubmissionStatus accessToken="tok" />
        </Suspense>
      </QueryClientProvider>
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([createRoute({ getParentRoute: () => root, path: "/" })]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole("heading", { level: 1 })
}

describe("SubmissionStatus", () => {
  beforeEach(() => get.mockReset())

  it("shows a confirmed term with the amount and the payment details", async () => {
    await renderStatus(data())

    expect(screen.getByText("LK-0048 · Letní kemp 2027")).toBeInTheDocument()
    expect(screen.getByText("Confirmed")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "To pay for the confirmed terms" })).toBeVisible()
    expect(screen.getByText("123456789/0800")).toBeInTheDocument()
    expect(screen.getByText("0048")).toBeInTheDocument()
    expect(screen.getByText(/created a participant account for jana@example.com/)).toBeVisible()
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute(
      "href",
      "/participant/login",
    )
  })

  it("shows a waitlisted term only as waiting for confirmation, and the payment for the confirmed one", async () => {
    await renderStatus(
      data({
        applications: [
          jana(),
          {
            firstName: "Matěj",
            lastName: "Novák",
            code: "LK-0049",
            variableSymbol: "0049",
            terms: [term("t2", "WAITLISTED", "2027-07-19", "2027-07-25")],
          },
        ],
      }),
    )

    expect(screen.getByText("Waiting for confirmation")).toBeInTheDocument()
    expect(screen.getByText("Do not pay yet")).toBeInTheDocument()
    expect(screen.queryByText(/waitlist|substitute|position/i)).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "To pay for the confirmed terms" })).toBeVisible()
  })

  it("shows no payment details when every term is waiting for confirmation", async () => {
    await renderStatus(data({ applications: [jana("WAITLISTED")], payment: null }))

    expect(screen.getByRole("heading", { name: "Do not pay anything yet" })).toBeVisible()
    expect(screen.queryByText("Organization account")).not.toBeInTheDocument()
    expect(screen.queryByText("123456789/0800")).not.toBeInTheDocument()
  })

  it("tells an applicant with an existing account to sign in", async () => {
    await renderStatus(data({ isNewAccount: false }))

    expect(screen.getByText(/You already have an account for jana@example.com/)).toBeVisible()
    expect(screen.getByRole("link", { name: "Sign in to the application" })).toBeVisible()
  })
})
