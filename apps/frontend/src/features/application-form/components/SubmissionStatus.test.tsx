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
import userEvent from "@testing-library/user-event"
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
const person = (
  firstName: string,
  lastName: string,
  number: string,
  status: "CONFIRMED" | "WAITLISTED",
  start: string,
  end: string,
  amountCzk = 6900,
) => ({
  firstName,
  lastName,
  code: `LK-${number}`,
  variableSymbol: number,
  terms: [term(`t${number}`, status, start, end)],
  paymentStatus: status === "CONFIRMED" ? ("UNPAID" as const) : ("NOTHING_DUE" as const),
  payment:
    status === "CONFIRMED"
      ? { bankAccount: "123456789/0800", variableSymbol: number, amountCzk }
      : null,
})
const jana = (status: "CONFIRMED" | "WAITLISTED" = "CONFIRMED") =>
  person("Jana", "Nováková", "0048", status, "2027-07-12", "2027-07-18")

const data = (overrides: Partial<Data> = {}): Data => ({
  eventName: "Letní kemp 2027",
  email: "jana@example.com",
  isNewAccount: true,
  applications: [jana()],
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
  it("copies the variable symbol for the selected participant", async () => {
    const user = userEvent.setup()
    const write = vi.spyOn(navigator.clipboard, "writeText")
    await renderStatus(
      data({
        applications: [
          jana(),
          person("Matěj", "Novák", "0049", "CONFIRMED", "2027-08-02", "2027-08-08", 7400),
        ],
      }),
    )
    const button = screen.getAllByRole("button", { name: "Copy variable symbol" }).at(1)
    expect(button).toBeDefined()
    if (!button) throw new Error("Missing second participant copy button")
    await user.click(button)
    expect(write).toHaveBeenLastCalledWith("0049")
  })

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

  it("gives every participant with a confirmed term an own payment with an own variable symbol", async () => {
    await renderStatus(
      data({
        applications: [
          jana(),
          person("Matěj", "Novák", "0049", "CONFIRMED", "2027-08-02", "2027-08-08", 7400),
        ],
      }),
    )

    expect(screen.getAllByRole("heading", { name: "To pay for the confirmed terms" })).toHaveLength(
      2,
    )
    expect(screen.getByText("0048")).toBeInTheDocument()
    expect(screen.getByText("0049")).toBeInTheDocument()
    expect(screen.getByText(/^Matěj:/)).toHaveTextContent(/7.400/)
    expect(screen.queryByText(/14,300/)).not.toBeInTheDocument()
  })

  it("shows a waitlisted term only as waiting for confirmation, with no payment for it", async () => {
    await renderStatus(
      data({
        applications: [
          jana(),
          person("Matěj", "Novák", "0049", "WAITLISTED", "2027-07-19", "2027-07-25"),
        ],
      }),
    )

    expect(screen.getByText("Waiting for confirmation")).toBeInTheDocument()
    expect(screen.getByText("Do not pay yet")).toBeInTheDocument()
    expect(screen.queryByText(/waitlist|substitute|position/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole("heading", { name: "To pay for the confirmed terms" })).toHaveLength(
      1,
    )
    expect(screen.queryByText("0049")).not.toBeInTheDocument()
  })

  it("shows no payment details when every term is waiting for confirmation", async () => {
    await renderStatus(data({ applications: [jana("WAITLISTED")] }))

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
