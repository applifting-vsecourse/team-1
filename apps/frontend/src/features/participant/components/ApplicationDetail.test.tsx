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
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MyApplication } from "@/features/participant/api/applications"
import { ApplicationDetail } from "@/features/participant/components/ApplicationDetail"

const { get, put, post, toDataURL } = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  toDataURL: vi.fn(),
}))
vi.mock("@/lib/api-client", () => ({ api: { get, put, post } }))
vi.mock("qrcode", () => ({ default: { toDataURL } }))

const confirmed = {
  termId: "t1",
  name: "1. týden",
  startsOn: "2027-07-04",
  endsOn: "2027-07-10",
  status: "CONFIRMED" as const,
  priceCzk: 4500,
  transportOffered: false,
  transportDecided: false,
}
const waitlisted = {
  termId: "t2",
  name: "2. týden",
  startsOn: "2027-07-11",
  endsOn: "2027-07-17",
  status: "WAITLISTED" as const,
  priceCzk: 4900,
  transportOffered: false,
  transportDecided: false,
}

const application = (overrides: Partial<MyApplication> = {}): MyApplication => ({
  id: "a1",
  eventName: "Letní kemp 2027",
  firstName: "Jana",
  lastName: "Nováková",
  code: "LKL-0048",
  variableSymbol: "48000",
  terms: [confirmed],
  amountDueCzk: 4500,
  amountPaidCzk: 2000,
  amountOwedCzk: 2500,
  paymentStatus: "PARTIALLY_PAID",
  organizationContact: {
    name: "Letní kemp z. s.",
    email: "info@letni-kemp.example",
    phone: "+420 777 000 003",
  },
  paymentDetails: {
    bankAccount: "2900123456/2010",
    summary: { variableSymbol: "48000", payableCzk: 2500 },
    terms: [
      {
        termId: "t1",
        termNumber: 1,
        variableSymbol: "48001",
        dueCzk: 4500,
        paidCzk: 2000,
        owedCzk: 2500,
        paymentStatus: "PARTIALLY_PAID" as const,
        paymentDeadline: "2026-11-15T00:00:00.000Z",
      },
    ],
  },
  ...overrides,
})

const termPayment = (
  number: number,
  dueCzk: number,
  paidCzk: number,
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERPAID",
) => ({
  termId: `t${number}`,
  termNumber: number,
  variableSymbol: `4800${number}`,
  dueCzk,
  paidCzk,
  owedCzk: dueCzk - paidCzk,
  paymentStatus,
  paymentDeadline: dueCzk > paidCzk ? "2026-11-15T00:00:00.000Z" : null,
})
const secondConfirmed = { ...waitlisted, status: "CONFIRMED" as const }
const withTerms = (
  payments: ReturnType<typeof termPayment>[],
  terms = [confirmed, secondConfirmed],
): MyApplication =>
  application({
    terms,
    paymentDetails: {
      bankAccount: "2900123456/2010",
      summary: {
        variableSymbol: "48000",
        payableCzk: payments.reduce((sum, item) => sum + Math.max(0, item.owedCzk), 0),
      },
      terms: payments,
    },
  })
const cardOf = (heading: RegExp): HTMLElement =>
  screen.getByRole("heading", { name: heading }).closest<HTMLElement>("[data-slot='card']")!

/** Cards of the term payments start collapsed; open them all (US-41). */
const openAll = async (): Promise<void> => {
  const user = userEvent.setup()
  const triggers = await screen.findAllByRole("button", { expanded: false })
  for (const trigger of triggers.filter(
    (el) => el.getAttribute("data-slot") === "accordion-trigger",
  )) {
    await user.click(trigger)
  }
}

const renderDetail = (
  data: MyApplication,
  canChangeImmediately = true,
  owedAfterChangeCzk = 4900,
) => {
  const paid = (termId: string) =>
    data.paymentDetails?.terms.find((payment) => payment.termId === termId)?.paidCzk ?? 0
  const owed = (termId: string) => {
    const term = data.terms.find((row) => row.termId === termId)
    return term?.status === "CONFIRMED" ? Math.max(0, term.priceCzk - paid(termId)) : 0
  }
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path.endsWith("change-requests")
          ? []
          : path.endsWith("change-options")
            ? {
                canChangeImmediately,
                terms: [
                  {
                    id: "t1",
                    name: "1. týden",
                    startsOn: "2027-07-04",
                    endsOn: "2027-07-10",
                    priceCzk: 4500,
                    owedAfterChangeCzk: 4500,
                    paidCzk: paid("t1"),
                    owedBeforeCancellationCzk: owed("t1"),
                    owedAfterCancellationCzk: 0,
                    overpaymentAfterCancellationCzk: paid("t1"),
                    selected: data.terms.some(
                      (term) => term.termId === "t1" && term.status !== "CANCELLED",
                    ),
                  },
                  {
                    id: "t2",
                    name: "2. týden",
                    startsOn: "2027-07-11",
                    endsOn: "2027-07-17",
                    priceCzk: 4900,
                    owedAfterChangeCzk,
                    paidCzk: paid("t2"),
                    owedBeforeCancellationCzk: owed("t2"),
                    owedAfterCancellationCzk: 0,
                    overpaymentAfterCancellationCzk: paid("t2"),
                    selected: data.terms.some(
                      (term) => term.termId === "t2" && term.status !== "CANCELLED",
                    ),
                  },
                ],
              }
            : data,
      ),
  }))
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ApplicationDetail applicationId="a1" />
      </QueryClientProvider>
    ),
  })
  const list = createRoute({ getParentRoute: () => root, path: "/participant" })
  const router = createRouter({
    routeTree: root.addChildren([list]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
}

describe("ApplicationDetail", () => {
  beforeEach(() => get.mockReset())

  it("copies the account, the variable symbol of the term and the amount to pay", async () => {
    const user = userEvent.setup()
    const write = vi.spyOn(navigator.clipboard, "writeText")
    renderDetail(application())
    await openAll()
    await user.click(await screen.findByRole("button", { name: "Copy account number" }))
    expect(write).toHaveBeenLastCalledWith("2900123456/2010")
    await user.click(screen.getByRole("button", { name: "Copy variable symbol" }))
    expect(write).toHaveBeenLastCalledWith("48001")
    await user.click(screen.getByRole("button", { name: "Copy amount" }))
    expect(write).toHaveBeenLastCalledWith("2500")
  })

  beforeEach(() => {
    get.mockReset()
    put.mockReset()
    post.mockReset()
    toDataURL.mockReset()
    toDataURL.mockResolvedValue("data:image/png;base64,AAAA")
  })

  it("lets the participant immediately change the selected terms", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({
      json: () => Promise.resolve({ addedTerms: [{ termId: "t2", owedCzk: 4900 }] }),
    })
    renderDetail(application())

    await user.click(await screen.findByRole("button", { name: "Change terms" }))
    expect(screen.getByText(/Overpayment CZK 2,000/)).toBeInTheDocument()
    expect(screen.getByText(/New term 2. týden · Price CZK 4,900/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Confirm change" }))

    expect(put).toHaveBeenCalledWith("participant/applications/a1/terms", {
      json: { termIds: ["t2"] },
    })
    expect(await screen.findByRole("heading", { name: "Term changed" })).toBeInTheDocument()
    expect(
      screen.getByText("New term 2. týden · Price CZK 4,900 · Amount due CZK 4,900"),
    ).toBeInTheDocument()
  })

  it("shows the price separately from zero debt for an unconfirmed term", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({
      json: () => Promise.resolve({ addedTerms: [{ termId: "t2", owedCzk: 0 }] }),
    })
    renderDetail(application(), true, 0)

    await user.click(await screen.findByRole("button", { name: "Change terms" }))
    const impact = "New term 2. týden · Price CZK 4,900 · Amount due CZK 0"
    expect(screen.getByText(impact)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Confirm change" }))
    expect(await screen.findByRole("heading", { name: "Term changed" })).toBeInTheDocument()
    expect(screen.getByText(impact)).toBeInTheDocument()
  })

  it("uses the committed debt when capacity changes after the preview", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({
      json: () => Promise.resolve({ addedTerms: [{ termId: "t2", owedCzk: 0 }] }),
    })
    renderDetail(application())

    await user.click(await screen.findByRole("button", { name: "Change terms" }))
    expect(screen.getByText(/Amount due CZK 4,900/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Confirm change" }))
    expect(await screen.findByRole("heading", { name: "Term changed" })).toBeInTheDocument()
    expect(
      screen.getByText(/New term 2. týden · Price CZK 4,900 · Amount due CZK 0/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Amount due CZK 4,900/)).not.toBeInTheDocument()
  })

  it("does not invent zero debt when a repeated change adds no term", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({ json: () => Promise.resolve({ addedTerms: [] }) })
    renderDetail(application())

    await user.click(await screen.findByRole("button", { name: "Change terms" }))
    await user.click(screen.getByRole("button", { name: "Confirm change" }))
    expect(await screen.findByRole("heading", { name: "Term changed" })).toBeInTheDocument()
    expect(screen.queryByText(/New term .*Amount due/)).not.toBeInTheDocument()
  })

  it("submits an approval request after cancellation starts", async () => {
    const user = userEvent.setup()
    post.mockReturnValue({
      json: () =>
        Promise.resolve({
          id: "r1",
          applicationId: "a1",
          eventId: "e1",
          participantName: "Jana Nováková",
          participantGender: "FEMALE",
          currentTermIds: ["t1"],
          requestedTermIds: ["t2"],
          status: "PENDING",
          rejectionReason: null,
          createdAt: "2026-11-05T14:30:00.000Z",
          reviewedAt: null,
          terms: [],
        }),
    })
    renderDetail(application(), false)
    await user.click(await screen.findByRole("button", { name: "Change terms" }))
    expect(screen.getByText(/original terms and assigned bed remain/)).toBeInTheDocument()
    expect(
      screen.getByText(/New term 2. týden · Price CZK 4,900 · Amount due CZK 4,900/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Send request" }))
    expect(post).toHaveBeenCalledWith("participant/applications/a1/change-requests", {
      json: { termIds: ["t2"] },
    })
    expect(
      await screen.findByRole("heading", { name: "Request awaiting approval" }),
    ).toBeInTheDocument()
  })

  it("cancels one term and shows its payment and bed impact before confirmation", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({ json: () => Promise.resolve({ addedTerms: [] }) })
    renderDetail(withTerms([termPayment(1, 4500, 4500, "PAID")]))

    await user.click(await screen.findByRole("button", { name: "Cancel participation" }))
    await user.click(screen.getByRole("combobox", { name: "Cancellation scope" }))
    await user.click(screen.getByRole("option", { name: /1. týden/ }))
    expect(
      screen.getByText(/Paid CZK 4,500 · Debt after cancellation CZK 0 · Overpayment CZK 4,500/),
    ).toBeInTheDocument()
    expect(
      screen.getByText("The bed will be released. The organiser handles any refund."),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Confirm cancellation" }))
    expect(put).toHaveBeenCalledWith("participant/applications/a1/terms", {
      json: { termIds: ["t2"] },
    })
  })

  it.each([
    [
      "Cancel participation",
      "Confirm cancellation",
      "Cancellation confirmed",
      /Debt after cancellation CZK 0/,
    ],
    [
      "Change terms",
      "Confirm change",
      "Term changed",
      /Original term · Overpayment CZK 0 · Debt CZK 0/,
    ],
  ])(
    "shows debt removed by %s for an unpaid confirmed term",
    async (open, submit, title, impact) => {
      const user = userEvent.setup()
      put.mockReturnValue({
        json: () => Promise.resolve({ addedTerms: [{ termId: "t2", owedCzk: 4900 }] }),
      })
      renderDetail(withTerms([termPayment(1, 4500, 0, "UNPAID")], [confirmed]))

      await user.click(await screen.findByRole("button", { name: open }))
      expect(screen.getByText(impact)).toBeInTheDocument()
      expect(screen.queryByText(/No payment impact/)).not.toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: submit }))
      expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument()
      expect(screen.getByText(impact)).toBeInTheDocument()
    },
  )

  it("shows what is due, what is paid, what is left and where to send it for the term", async () => {
    renderDetail(application())

    expect(
      await screen.findByRole("heading", { level: 1, name: "Letní kemp 2027" }),
    ).toBeInTheDocument()
    await openAll()
    expect(screen.getByText("Partly paid")).toBeInTheDocument()
    expect(screen.getByText("Amount due").nextSibling).toHaveTextContent("4,500")
    expect(screen.getByText("Paid").nextSibling).toHaveTextContent("2,000")
    expect(screen.getByText("Left to pay").nextSibling).toHaveTextContent("2,500")
    expect(screen.getByText("2900123456/2010")).toBeInTheDocument()
    expect(screen.getByText("48001")).toBeInTheDocument()
    // The summary symbol and the total are for the whole application, not for one term.
    expect(screen.queryByText("48000")).not.toBeInTheDocument()
    expect(screen.queryByText("Left to pay in total")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "← All applications" })).toHaveAttribute(
      "href",
      "/participant",
    )
  })

  it("shows the organization contact at the end of the detail", async () => {
    renderDetail(application())

    expect(await screen.findByRole("heading", { name: "Organization contact" })).toBeInTheDocument()
    expect(screen.getByText("Letní kemp z. s.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "+420 777 000 003" })).toHaveAttribute(
      "href",
      "tel:+420777000003",
    )
  })

  it("names the event prominently with the application code", async () => {
    renderDetail(application())

    expect(
      await screen.findByRole("heading", { level: 1, name: "Letní kemp 2027" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Jana Nováková · LKL-0048")).toBeInTheDocument()
    expect(screen.queryByText("My application")).not.toBeInTheDocument()
  })

  it("shows the debt of each confirmed term separately and the total (500 + 700 CZK)", async () => {
    renderDetail(
      withTerms([
        termPayment(1, 4900, 4400, "PARTIALLY_PAID"),
        termPayment(2, 5600, 4900, "PARTIALLY_PAID"),
      ]),
    )

    expect(await screen.findByRole("heading", { name: "Left to pay in total" })).toBeInTheDocument()
    await openAll()
    expect(
      screen.getByRole("heading", { name: "Left to pay in total" }).nextSibling,
    ).toHaveTextContent("1,200")
    expect(
      screen.getByRole("button", { name: "One payment for both terms · show QR" }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/You pay each term separately/)).not.toBeInTheDocument()
    const one = cardOf(/^4–10 Jul 2027/)
    const two = cardOf(/^11–17 Jul 2027/)
    expect(within(one).getByText("Left to pay").nextSibling).toHaveTextContent("500")
    expect(within(one).getByText("48001")).toBeInTheDocument()
    expect(within(two).getByText("Left to pay").nextSibling).toHaveTextContent("700")
    expect(within(two).getByText("48002")).toBeInTheDocument()
    // One symbol per term, no symbol of the whole application.
    expect(screen.queryByText("48000")).not.toBeInTheDocument()
  })

  it("keeps separate-term instructions when the summary QR cannot be generated", async () => {
    const data = withTerms([
      termPayment(1, 4900, 4400, "PARTIALLY_PAID"),
      termPayment(2, 5600, 4900, "PARTIALLY_PAID"),
    ])
    renderDetail({
      ...data,
      paymentDetails: {
        ...data.paymentDetails!,
        summary: { variableSymbol: "invalid", payableCzk: 1200 },
      },
    })

    await openAll()
    expect(
      await screen.findByText(/You pay each term separately\. Use its variable symbol/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "One payment for both terms · show QR" }),
    ).not.toBeInTheDocument()
    expect(within(cardOf(/^4–10 Jul 2027/)).getByText("48001")).toBeInTheDocument()
    expect(within(cardOf(/^11–17 Jul 2027/)).getByText("48002")).toBeInTheDocument()
  })

  it("keeps the paid term collapsed and the term confirmed later, with its debt, first", async () => {
    renderDetail(withTerms([termPayment(1, 4500, 4500, "PAID"), termPayment(2, 4900, 0, "UNPAID")]))

    const paid = await screen.findByRole("button", { name: /4–10 Jul 2027.*Paid/ })
    expect(paid).toHaveAttribute("aria-expanded", "false")
    await openAll()
    const unpaid = screen.getByRole("heading", { name: /^11–17 Jul 2027/ })
    // Two confirmed terms and something left: the total shows, the hint only for several debts.
    expect(
      screen.getByRole("heading", { name: "Left to pay in total" }).nextSibling,
    ).toHaveTextContent("4,900")
    expect(screen.queryByText(/You pay each term separately/)).not.toBeInTheDocument()
    expect(
      within(cardOf(/^11–17 Jul 2027/)).getByText("Left to pay").nextSibling,
    ).toHaveTextContent("4,900")
    expect(unpaid.compareDocumentPosition(paid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("opens a paid term to its amounts and payment details on demand", async () => {
    const user = userEvent.setup()
    renderDetail(
      withTerms([termPayment(1, 4500, 4500, "PAID"), termPayment(2, 4500, 4500, "PAID")]),
    )

    const toggles = await screen.findAllByRole("button", { name: /Paid/ })
    expect(toggles).toHaveLength(2)
    expect(screen.queryByText("Amount due")).not.toBeInTheDocument()
    expect(screen.queryByText("Left to pay in total")).not.toBeInTheDocument()

    await user.click(toggles[0]!)

    expect(toggles[0]).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Amount due").nextSibling).toHaveTextContent("4,500")
    expect(screen.getByText("48001")).toBeInTheDocument()
    expect(toggles[1]).toHaveAttribute("aria-expanded", "false")
  })

  it("shows an overpaid term as an overpayment, without the details to pay", async () => {
    renderDetail(withTerms([termPayment(1, 4500, 5100, "OVERPAID")], [confirmed]))

    expect(await screen.findByText("Overpaid")).toBeInTheDocument()
    await openAll()
    expect(screen.getByText("Overpayment").nextSibling).toHaveTextContent("600")
    expect(screen.queryByText("Left to pay")).not.toBeInTheDocument()
    expect(screen.queryByText("Amount to pay")).not.toBeInTheDocument()
    expect(screen.queryByText("Variable symbol")).not.toBeInTheDocument()
  })

  it("shows a waitlisted term as waitlisted without a place in line, nothing to pay yet", async () => {
    renderDetail(application({ terms: [confirmed, waitlisted] }))

    expect(await screen.findByText(/11–17 Jul 2027 · 2\. týden · Waitlisted/)).toBeInTheDocument()
    expect(screen.getByText("You don't pay anything yet.")).toBeInTheDocument()
    expect(screen.queryByText(/in line|position/i)).not.toBeInTheDocument()
    // Its payment details are not shown: there is no variable symbol to pay.
    expect(screen.queryByText("48002")).not.toBeInTheDocument()
  })

  it("shows a term to evaluate as awaiting evaluation, never as waitlisted (US-102)", async () => {
    renderDetail(
      application({
        terms: [{ ...waitlisted, status: "TO_EVALUATE" as const }],
        amountDueCzk: 0,
        amountOwedCzk: 0,
        amountPaidCzk: 0,
        paymentStatus: "NOTHING_DUE",
        paymentDetails: null,
      }),
    )

    expect(await screen.findByText("Awaiting evaluation")).toBeInTheDocument()
    expect(screen.queryByText(/waitlisted/i)).not.toBeInTheDocument()
    expect(screen.getByText("Don't pay yet.")).toBeInTheDocument()
    expect(screen.getByText(/not a confirmed place or a waitlist spot yet/)).toBeInTheDocument()
    expect(screen.queryByText("Account")).not.toBeInTheDocument()
  })

  it("shows only waitlisted cards, with no payment details, when every term is waitlisted", async () => {
    renderDetail(
      application({
        terms: [waitlisted],
        amountDueCzk: 0,
        amountOwedCzk: 0,
        amountPaidCzk: 0,
        paymentStatus: "NOTHING_DUE",
        paymentDetails: null,
      }),
    )

    expect(await screen.findByText(/Waitlisted/)).toBeInTheDocument()
    expect(screen.getByText("You don't pay anything yet.")).toBeInTheDocument()
    expect(screen.queryByText("Account")).not.toBeInTheDocument()
    expect(screen.queryByText("Variable symbol")).not.toBeInTheDocument()
  })

  it("offers one QR with the current total debt and summary symbol for both confirmed terms", async () => {
    const second = { ...waitlisted, status: "CONFIRMED" as const }
    renderDetail(
      application({
        terms: [confirmed, second],
        amountDueCzk: 9400,
        amountPaidCzk: 8200,
        amountOwedCzk: 1200,
        paymentDetails: {
          bankAccount: "2900123456/2010",
          summary: { variableSymbol: "48000", payableCzk: 1200 },
          terms: [
            {
              termId: "t1",
              termNumber: 1,
              variableSymbol: "48001",
              dueCzk: 4500,
              paidCzk: 4000,
              owedCzk: 500,
              paymentStatus: "PARTIALLY_PAID",
              paymentDeadline: "2026-11-15T00:00:00.000Z",
            },
            {
              termId: "t2",
              termNumber: 2,
              variableSymbol: "48002",
              dueCzk: 4900,
              paidCzk: 4200,
              owedCzk: 700,
              paymentStatus: "PARTIALLY_PAID",
              paymentDeadline: "2026-11-15T00:00:00.000Z",
            },
          ],
        },
      }),
    )
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole("button", { name: "One payment for both terms · show QR" }),
    )
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Summary variable symbol")).toBeInTheDocument()
    expect(within(dialog).getByText("48000")).toBeInTheDocument()
    expect(within(dialog).getByText("Breakdown")).toBeInTheDocument()
    expect(within(dialog).getByText(/Covers all confirmed terms/)).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        (_, element) =>
          element?.tagName === "DIV" && /^4–10 Jul 2027.*500/.test(element.textContent ?? ""),
      ),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        (_, element) =>
          element?.tagName === "DIV" && /^11–17 Jul 2027.*700/.test(element.textContent ?? ""),
      ),
    ).toBeInTheDocument()
    expect(toDataURL).toHaveBeenCalledWith(
      expect.stringMatching(
        /^SPD\*1\.0\*ACC:CZ\d{22}\*AM:1200\.00\*CC:CZK\*X-VS:48000\*MSG:Letni kemp 2027$/,
      ),
      { width: 200, margin: 2 },
    )
    expect(
      await within(dialog).findByRole("img", { name: "QR code for the combined payment" }),
    ).toHaveAttribute("src", "data:image/png;base64,AAAA")
  })

  describe("payment details of a term (US-41)", () => {
    const paidTerm = { ...termPayment(1, 4500, 4500, "PAID"), paymentDeadline: null }

    it("shows the due date and a QR with the debt, the term's symbol and the event name", async () => {
      renderDetail(withTerms([termPayment(1, 4500, 2000, "PARTIALLY_PAID"), paidTerm]))

      await openAll()
      const card = (await screen.findByText("Due date")).closest<HTMLElement>("[data-slot='card']")!
      expect(within(card).getByText(/15 Nov 2026/)).toBeInTheDocument()
      expect(
        await within(card).findByRole("img", { name: "QR code for the term payment" }),
      ).toHaveAttribute("src", "data:image/png;base64,AAAA")
      expect(toDataURL).toHaveBeenCalledWith(
        expect.stringMatching(
          /^SPD\*1\.0\*ACC:CZ\d{22}\*AM:2500\.00\*CC:CZK\*X-VS:48001\*MSG:Letni kemp 2027$/,
        ),
        { width: 200, margin: 2 },
      )
    })

    it("draws no QR for a paid term", async () => {
      renderDetail(withTerms([paidTerm], [confirmed]))

      await screen.findByText(/4–10 Jul/)
      expect(screen.queryByRole("img", { name: "QR code for the term payment" })).toBeNull()
      expect(toDataURL).not.toHaveBeenCalled()
    })

    it("draws no QR for an overpaid term", async () => {
      renderDetail(
        withTerms(
          [{ ...termPayment(1, 4500, 5000, "OVERPAID"), paymentDeadline: null }],
          [confirmed],
        ),
      )

      await screen.findByText(/4–10 Jul/)
      expect(screen.queryByRole("img", { name: "QR code for the term payment" })).toBeNull()
      expect(screen.queryByText("Due date")).toBeNull()
    })
  })

  describe("transport (US-65)", () => {
    const withTransport = (isDecided: boolean): MyApplication =>
      application({
        terms: [{ ...confirmed, transportOffered: true, transportDecided: isDecided }],
      })

    it("asks for a transport in a checklist and separates terms and transport into sections", async () => {
      renderDetail(withTransport(false))

      expect(await screen.findByRole("heading", { name: "What is left to arrange" })).toBeVisible()
      expect(screen.getByText("0 of 1 done")).toBeVisible()
      expect(screen.getByRole("heading", { name: /^Transport · / })).toBeVisible()
      expect(screen.getByRole("heading", { name: "Terms and payments" })).toBeVisible()
      expect(screen.getByRole("heading", { name: "Transport" })).toBeVisible()
      expect(screen.getByRole("link", { name: "Choose transport" })).toHaveAttribute(
        "href",
        "/participant/applications/a1/transport",
      )
    })

    it("shows the step as done and offers a change once the transport is chosen", async () => {
      renderDetail(withTransport(true))

      expect(await screen.findByText("1 of 1 done")).toBeVisible()
      expect(screen.getByRole("link", { name: "Change transport" })).toBeVisible()
      expect(screen.queryByRole("link", { name: "Choose transport" })).toBeNull()
    })

    it("asks for nothing when no transport is offered", async () => {
      renderDetail(application())

      await screen.findByText(/4–10 Jul/)
      expect(screen.queryByRole("heading", { name: "What is left to arrange" })).toBeNull()
      expect(screen.queryByRole("heading", { name: "Transport" })).toBeNull()
    })
  })
})
