import { Suspense, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SubmissionStatus as Data } from "@/features/application-form/api/submissionStatus"
import {
  SubmissionStatus,
  type SignedInParticipant,
} from "@/features/application-form/components/SubmissionStatus"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const term = (
  id: string,
  status: "CONFIRMED" | "WAITLISTED" | "TO_EVALUATE",
  start: string,
  end: string,
) => ({
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
  status: "CONFIRMED" | "WAITLISTED" | "TO_EVALUATE",
  start: string,
  end: string,
  amountCzk = 6900,
) => ({
  id: `app-${number}`,
  firstName,
  lastName,
  code: `LK-${number}`,
  variableSymbol: `${Number(number)}000`,
  terms: [term(`t${number}`, status, start, end)],
  paymentStatus: status === "CONFIRMED" ? ("UNPAID" as const) : ("NOTHING_DUE" as const),
  payment:
    status === "CONFIRMED"
      ? {
          bankAccount: "123456789/0800",
          summary: { variableSymbol: `${Number(number)}000`, payableCzk: amountCzk },
        }
      : null,
})
const jana = (status: "CONFIRMED" | "WAITLISTED" | "TO_EVALUATE" = "CONFIRMED") =>
  person("Jana", "Nováková", "0048", status, "2027-07-12", "2027-07-18")

const data = (overrides: Partial<Data> = {}): Data => ({
  eventName: "Letní kemp 2027",
  email: "jana@example.com",
  isNewAccount: true,
  applications: [jana()],
  ...overrides,
})

const owner = (email: string, shouldSetPassword = false): SignedInParticipant => ({
  email,
  mustSetPassword: shouldSetPassword,
})

const renderStatus = async (
  value: Data,
  signedInParticipant: SignedInParticipant | "loading" | null = null,
) => {
  get.mockReturnValue({ json: () => Promise.resolve(value) })
  let updateParticipant: (participant: SignedInParticipant | "loading" | null) => void = () => {
    throw new Error("Status has not rendered yet")
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Status() {
    const [participant, setParticipant] = useState(signedInParticipant)
    updateParticipant = setParticipant
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense>
          <SubmissionStatus
            accessToken="tok"
            signedInParticipant={participant}
          />
        </Suspense>
      </QueryClientProvider>
    )
  }
  const root = createRootRoute({ component: Status })
  const router = createRouter({
    routeTree: root.addChildren([createRoute({ getParentRoute: () => root, path: "/" })]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole("heading", { level: 1 })
  return (participant: SignedInParticipant | "loading" | null) =>
    act(() => updateParticipant(participant))
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
    expect(write).toHaveBeenLastCalledWith("49000")
  })

  beforeEach(() => get.mockReset())

  it("shows terms to evaluate as awaiting evaluation, not as a waitlist, without payment (US-102)", async () => {
    await renderStatus(data({ applications: [jana("TO_EVALUATE")] }))

    expect(screen.getByText("Awaiting evaluation")).toBeInTheDocument()
    expect(screen.queryByText(/waitlisted/i)).not.toBeInTheDocument()
    expect(screen.queryByText("Waitlisted")).not.toBeInTheDocument()
    expect(screen.getByText("Don't pay yet.")).toBeInTheDocument()
    expect(screen.getByText(/not a confirmed place or a waitlist spot yet/)).toBeInTheDocument()
    expect(screen.queryByText("Do not pay yet")).not.toBeInTheDocument()
    expect(screen.queryByText("123456789/0800")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "To pay for the confirmed terms" })).toBeNull()
  })

  it("shows a confirmed term with the amount and the payment details", async () => {
    await renderStatus(data())

    expect(screen.getByText("LK-0048 · Letní kemp 2027")).toBeInTheDocument()
    expect(screen.getByText("Confirmed")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "To pay for the confirmed terms" })).toBeVisible()
    expect(screen.getByText("123456789/0800")).toBeInTheDocument()
    expect(screen.getByText("48000")).toBeInTheDocument()
    expect(screen.getByText(/created a participant account for jana@example.com/)).toBeVisible()
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute(
      "href",
      "/participant/login",
    )
  })

  it("shows one payment card with the total, the account once and a symbol per participant", async () => {
    await renderStatus(
      data({
        applications: [
          jana(),
          person("Matěj", "Novák", "0049", "CONFIRMED", "2027-08-02", "2027-08-08", 7400),
        ],
      }),
    )

    expect(screen.getAllByRole("heading", { name: "To pay for the confirmed terms" })).toHaveLength(
      1,
    )
    const card = screen.getByRole("heading", {
      name: "To pay for the confirmed terms",
    }).parentElement!
    expect(card).toHaveTextContent(/14.300/)
    expect(card).toHaveTextContent(/Jana: .*6.900.* \+ Matěj: .*7.400/)
    expect(screen.getAllByText("123456789/0800")).toHaveLength(1)
    expect(screen.getByText("48000")).toBeInTheDocument()
    expect(screen.getByText("49000")).toBeInTheDocument()
    expect(screen.getByText(/^Matěj · .*7.400.* · variable symbol$/)).toBeInTheDocument()
    expect(card).toHaveTextContent(/Pay each application separately: .*VS 48000; Matěj .*VS 49000/)
  })

  it("names the symbol only plainly for a single payer", async () => {
    await renderStatus(data())

    expect(screen.getByText("Variable symbol")).toBeInTheDocument()
    expect(screen.queryByText(/Pay each application separately/)).not.toBeInTheDocument()
  })

  it("shows a waitlisted term as waitlisted without a place in line, with no payment for it", async () => {
    await renderStatus(
      data({
        applications: [
          jana(),
          person("Matěj", "Novák", "0049", "WAITLISTED", "2027-07-19", "2027-07-25"),
        ],
      }),
    )

    expect(screen.getByText("Waitlisted")).toBeInTheDocument()
    expect(screen.getByText("Do not pay yet")).toBeInTheDocument()
    expect(screen.queryByText(/in line|position/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole("heading", { name: "To pay for the confirmed terms" })).toHaveLength(
      1,
    )
    expect(screen.queryByText("49000")).not.toBeInTheDocument()
  })

  it("shows no payment details when every term is waitlisted", async () => {
    await renderStatus(data({ applications: [jana("WAITLISTED")] }))

    expect(screen.getByRole("heading", { name: "Do not pay anything yet" })).toBeVisible()
    expect(screen.queryByText("Organization bank account")).not.toBeInTheDocument()
    expect(screen.queryByText("123456789/0800")).not.toBeInTheDocument()
  })

  it("tells an applicant with an existing account to sign in", async () => {
    await renderStatus(data({ isNewAccount: false }))

    expect(screen.getByText(/You already have an account for jana@example.com/)).toBeVisible()
    expect(screen.getByRole("link", { name: "Sign in to the application" })).toBeVisible()
  })

  describe("link under the account card (#318)", () => {
    it("keeps the sign-in link for an applicant who is not signed in", async () => {
      await renderStatus(data())

      expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute(
        "href",
        "/participant/login",
      )
      expect(screen.queryByRole("link", { name: "View application" })).not.toBeInTheDocument()
    })

    it("opens the submitted application for a signed-in applicant who owns it", async () => {
      await renderStatus(data({ isNewAccount: false }), owner("Jana@Example.com"))

      expect(screen.getByRole("link", { name: "View application" })).toHaveAttribute(
        "href",
        "/participant/applications/app-0048",
      )
      expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument()
    })

    it("opens the list of applications when one submission holds several of them", async () => {
      await renderStatus(
        data({
          applications: [
            jana(),
            person("Matěj", "Novák", "0049", "CONFIRMED", "2027-08-02", "2027-08-08"),
          ],
        }),
        owner("jana@example.com"),
      )

      expect(screen.getByRole("link", { name: "View applications" })).toHaveAttribute(
        "href",
        "/participant",
      )
    })

    it("keeps the sign-in link for a signed-in organizer (the route passes no participant e-mail)", async () => {
      await renderStatus(data(), null)

      expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute(
        "href",
        "/participant/login",
      )
    })

    it("keeps the sign-in link for a signed-in applicant who applied for another e-mail", async () => {
      await renderStatus(data(), owner("someone-else@example.com", true))

      expect(screen.getByRole("link", { name: "Go to sign in" })).toBeVisible()
    })

    it("shows no action while the session is loading, then the link for the signed-in owner", async () => {
      const updateParticipant = await renderStatus(data({ isNewAccount: false }), "loading")

      expect(screen.getByText(/You already have an account/)).toBeVisible()
      expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("link", { name: "View application" })).not.toBeInTheDocument()

      updateParticipant(owner("jana@example.com"))
      expect(screen.getByRole("link", { name: "View application" })).toHaveAttribute(
        "href",
        "/participant/applications/app-0048",
      )
      expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument()
    })

    it("shows the sign-in action only after the session resolves as signed out", async () => {
      const updateParticipant = await renderStatus(data(), "loading")

      expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument()
      updateParticipant(null)
      expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute(
        "href",
        "/participant/login",
      )
    })

    it("offers setting the password after loading a signed-in owner who has none yet", async () => {
      const updateParticipant = await renderStatus(data(), "loading")
      updateParticipant(owner("jana@example.com", true))

      expect(screen.getByRole("link", { name: "Set password" })).toHaveAttribute(
        "href",
        "/participant/set-password",
      )
      expect(screen.queryByRole("link", { name: "View application" })).not.toBeInTheDocument()
    })
  })
})
