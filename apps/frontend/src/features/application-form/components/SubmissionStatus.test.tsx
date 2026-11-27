import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { Suspense, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, render, screen, within } from "@testing-library/react"
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

/** The summary card of one participant. */
const summaryOf = (firstName: string) => {
  const card = screen
    .getByText(new RegExp(`^${firstName} .* · application no\\.`))
    .closest<HTMLElement>("[data-slot=card]")
  if (!card) throw new Error(`No summary for ${firstName}`)
  return card
}

/** The stylesheet without every block that starts with `opening` (balanced braces). */
const withoutBlocks = (css: string, opening: string) => {
  let rest = css
  for (let start = rest.indexOf(opening); start !== -1; start = rest.indexOf(opening)) {
    let depth = 0
    let end = rest.indexOf("{", start)
    do {
      if (rest[end] === "{") depth += 1
      if (rest[end] === "}") depth -= 1
      end += 1
    } while (depth > 0)
    rest = rest.slice(0, start) + rest.slice(end)
  }
  return rest
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

    expect(screen.getByRole("heading", { level: 2, name: "Awaiting evaluation" })).toBeVisible()
    expect(
      screen.getByText(
        "Once the organizer decides, we'll e-mail you the result – don't pay anything until then.",
      ),
    ).toBeVisible()
    expect(within(summaryOf("Jana")).getByText("Awaiting evaluation")).toBeVisible()
    // APP_RECEIVED goes out in both evaluation modes, so the address is always named.
    expect(
      screen.getByText("Letní kemp 2027 · we sent the confirmation to jana@example.com"),
    ).toBeVisible()
    expect(screen.queryByText(/waitlist/i)).not.toBeInTheDocument()
    expect(screen.queryByText("Amount due")).not.toBeInTheDocument()
    expect(screen.queryByText("123456789/0800")).not.toBeInTheDocument()
  })

  it("shows a confirmed term with the amount due and the payment details", async () => {
    await renderStatus(data())

    expect(screen.getByRole("heading", { level: 2, name: "Your place is confirmed" })).toBeVisible()
    expect(screen.getByText("Pay the amount due using the payment details below.")).toBeVisible()
    const summary = summaryOf("Jana")
    expect(within(summary).getByText("Jana Nováková · application no. LK-0048")).toBeVisible()
    // The date is shown; the term name is read too, so two terms stay apart for a screen reader.
    const termValue = within(summary).getByText(/^12–18 Jul 2027/)
    expect(termValue).toHaveTextContent("12–18 Jul 2027 · t0048")
    expect(within(termValue).getByText("· t0048", { exact: false })).toHaveClass("sr-only")
    expect(within(summary).getByText("Confirmed")).toBeVisible()
    expect(within(summary).getByText("CZK 6,900")).toBeVisible()
    expect(within(summary).getByText("48000")).toBeVisible()
    expect(within(summary).getByText("123456789/0800")).toBeVisible()
    expect(within(summary).getByRole("button", { name: "Copy variable symbol" })).toBeVisible()
    expect(within(summary).getByRole("button", { name: "Copy account number" })).toBeVisible()
    expect(within(summary).getByRole("button", { name: "Download QR code" })).toBeVisible()
  })

  it("asks for no payment once nothing is left to pay, e.g. on a later visit after paying", async () => {
    await renderStatus(
      data({
        applications: [
          person("Jana", "Nováková", "0048", "CONFIRMED", "2027-07-12", "2027-07-18", 0),
        ],
      }),
    )

    expect(screen.getByRole("heading", { level: 2, name: "Your place is confirmed" })).toBeVisible()
    expect(screen.queryByText("Pay the amount due using the payment details below.")).toBeNull()
    const summary = summaryOf("Jana")
    expect(within(summary).getByText("CZK 0")).toBeVisible()
    expect(within(summary).queryByText("48000")).toBeNull()
    expect(within(summary).queryByText("123456789/0800")).toBeNull()
    expect(within(summary).queryByRole("button", { name: "Download QR code" })).toBeNull()
  })

  it("keeps the payment instruction while one participant still owes, without details for the paid one", async () => {
    await renderStatus(
      data({
        applications: [
          person("Jana", "Nováková", "0048", "CONFIRMED", "2027-07-12", "2027-07-18", 0),
          person("Karel", "Novák", "0049", "CONFIRMED", "2027-07-12", "2027-07-18"),
        ],
      }),
    )

    expect(screen.getByText("Pay the amount due using the payment details below.")).toBeVisible()
    expect(within(summaryOf("Jana")).queryByText("48000")).toBeNull()
    expect(within(summaryOf("Karel")).getByText("49000")).toBeVisible()
  })

  it("labels the first of several terms and keeps the next ones in the value column", async () => {
    const twoTerms = {
      ...jana(),
      terms: [
        term("t1", "CONFIRMED", "2027-07-12", "2027-07-18"),
        term("t2", "WAITLISTED", "2027-07-19", "2027-07-25"),
      ],
    }
    await renderStatus(data({ applications: [twoTerms] }))

    const labels = within(summaryOf("Jana")).getAllByRole("term")
    const termLabels = labels.filter((label) => label.textContent === "Term")
    expect(termLabels).toHaveLength(2)
    expect(termLabels[0]).not.toHaveClass("sr-only")
    expect(termLabels[1]).toHaveClass("sr-only")
    // A grid from sm: the value keeps the second column even when its label is only read.
    for (const label of termLabels) {
      expect(label.nextElementSibling).toHaveClass("sm:col-start-2")
      expect(label.parentElement).toHaveClass("sm:grid", "sm:grid-cols-[11rem_minmax(0,1fr)]")
    }
    expect(within(summaryOf("Jana")).getByText("Waitlisted")).toBeVisible()
  })

  it("explains the new account once, with the spam hint and the sign-in action", async () => {
    await renderStatus(data())

    expect(
      screen.getByText(
        "We created an account for you – you'll find the link for your first sign-in in the e-mail. It's valid for 7 days.",
      ),
    ).toBeVisible()
    expect(screen.getByText("No e-mail? Check your spam folder.")).toBeVisible()
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute(
      "href",
      "/participant/login",
    )
  })

  it("gives every participant their own summary with their amount and variable symbol", async () => {
    await renderStatus(
      data({
        applications: [
          jana(),
          person("Matěj", "Novák", "0049", "CONFIRMED", "2027-08-02", "2027-08-08", 7400),
        ],
      }),
    )

    expect(screen.getAllByRole("heading", { name: "Your place is confirmed" })).toHaveLength(1)
    expect(summaryOf("Jana")).toHaveTextContent(/CZK\s6,900.*48000/)
    expect(summaryOf("Matěj")).toHaveTextContent(/CZK\s7,400.*49000/)
    expect(summaryOf("Matěj")).not.toHaveTextContent("48000")
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

    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      "Your place is confirmed",
      "Added to the waitlist",
      "How to get back to your application",
    ])
    expect(
      screen.getByText("If we confirm your place, we'll e-mail you – don't pay for it until then."),
    ).toBeVisible()
    expect(within(summaryOf("Matěj")).getByText("Waitlisted")).toBeVisible()
    expect(within(summaryOf("Matěj")).queryByText("Amount due")).not.toBeInTheDocument()
    expect(screen.getAllByText("Amount due")).toHaveLength(1)
    expect(screen.queryByText(/in line|position/i)).not.toBeInTheDocument()
    expect(screen.queryByText("49000")).not.toBeInTheDocument()
  })

  it("shows no payment details when every term is waitlisted", async () => {
    await renderStatus(data({ applications: [jana("WAITLISTED")] }))

    expect(screen.getByRole("heading", { name: "Added to the waitlist" })).toBeVisible()
    expect(screen.queryByRole("heading", { name: "Your place is confirmed" })).toBeNull()
    expect(screen.queryByText("Bank account")).not.toBeInTheDocument()
    expect(screen.queryByText("123456789/0800")).not.toBeInTheDocument()
  })

  // Centred like the empty, error and system pages (the user's wish); the summary stays a table.
  it("centres the hero, the state blocks and the account block, not the summary", async () => {
    await renderStatus(data())

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "We've received your application",
    })
    const hero = heading.parentElement?.parentElement
    expect(hero).toHaveClass("items-center", "text-center")
    expect(heading.parentElement).toHaveClass("max-w-140")
    // The illustration sits above the heading, on a phone and on a desktop alike.
    const sticker = document.querySelector(".sticker")
    expect(sticker).not.toBeNull()
    if (!sticker) return
    expect(sticker.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(hero).not.toHaveClass("sm:flex-row")

    const state = screen.getByRole("heading", { level: 2, name: "Your place is confirmed" })
    expect(state.closest("section")).toHaveClass("items-center", "text-center")
    const account = screen.getByRole("heading", {
      level: 2,
      name: "How to get back to your application",
    })
    expect(account.closest("section")).toHaveClass("items-center", "text-center")
    expect(screen.getByText(/We created an account for you/)).toHaveClass("max-w-140")
    expect(summaryOf("Jana")).not.toHaveClass("text-center")
    expect(within(summaryOf("Jana")).getByText("Participant").parentElement).not.toHaveClass(
      "text-center",
    )
  })

  describe("celebration", () => {
    it("assembles the camp and sticks the sticker only when a term is confirmed", async () => {
      await renderStatus(data())

      const sticker = document.querySelector(".sticker")
      expect(sticker).toHaveTextContent("Confirmed")
      expect(sticker).toHaveAttribute("data-animated", "true")
      // Decoration only: the confirmed state is read from the heading and the badge.
      expect(sticker?.closest(".brand-assemble")).toHaveAttribute("aria-hidden", "true")
    })

    it.each(["TO_EVALUATE", "WAITLISTED"] as const)(
      "keeps the waiting camp still, with no check by the heading (%s)",
      async (status) => {
        await renderStatus(data({ applications: [jana(status)] }))

        expect(document.querySelector(".sticker")).toBeNull()
        expect(document.querySelector(".brand-assemble")).toBeNull()
        // Figma hides the M04 layer by the heading („skryto · M04 · saved-mark“).
        expect(document.querySelector(".saved-mark")).toBeNull()
      },
    )

    it("plays M31 and M32 only without the reduced-motion preference", () => {
      const css = readFileSync(resolve(process.cwd(), "src/styles/global.css"), "utf8")
      const outsideMotion = withoutBlocks(css, "@media (prefers-reduced-motion: no-preference)")

      expect(css).toMatch(/\.brand-assemble \.arc-1 \{\s*animation/)
      expect(css).toMatch(/\.sticker\[data-animated\] \{\s*animation/)
      expect(outsideMotion).not.toContain(".brand-assemble")
      expect(outsideMotion).not.toContain(".sticker[data-animated]")
    })
  })

  it("tells an applicant with an existing account to sign in", async () => {
    await renderStatus(data({ isNewAccount: false }))

    expect(screen.getByText(/You already have an account for jana@example.com/)).toBeVisible()
    expect(screen.getByRole("link", { name: "Sign in to the application" })).toBeVisible()
  })

  describe("action in the account block (#318)", () => {
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
