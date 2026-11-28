import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

import type { EditableApplication } from "@/features/participant/api/applicationEdit"
import type { MyApplication } from "@/features/participant/api/applications"
import { ApplicationDetail } from "@/features/participant/components/ApplicationDetail"

const { get, put, post, toDataURL } = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  toDataURL: vi.fn(),
}))
vi.mock("@/lib/api-client", () => ({ api: { get, put, post } }))
vi.mock("@/lib/notify", () => ({
  notify: { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))
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
  termEditable: true,
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
  termEditable: true,
}

const application = (overrides: Partial<MyApplication> = {}): MyApplication => ({
  id: "a1",
  eventName: "Letní kemp 2027",
  firstName: "Jana",
  lastName: "Nováková",
  code: "LKL-0048",
  variableSymbol: "48000",
  canSimulatePayment: false,
  simulatedPayments: [],
  terms: [confirmed],
  mealsDecided: false,
  mealsEditable: true,
  healthDecided: false,
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
const renderDetail = (
  data: MyApplication,
  canChangeImmediately = true,
  owedAfterChangeCzk = 4900,
  optionsState?: "loading" | "error",
  edits: EditableApplication["history"] = [],
) => {
  const paid = (termId: string) =>
    data.paymentDetails?.terms.find((payment) => payment.termId === termId)?.paidCzk ?? 0
  const owed = (termId: string) => {
    const term = data.terms.find((row) => row.termId === termId)
    return term?.status === "CONFIRMED" ? Math.max(0, term.priceCzk - paid(termId)) : 0
  }
  get.mockImplementation((path: string) => ({
    json: () => {
      if (path.endsWith("/edit")) {
        return Promise.resolve({
          id: data.id,
          eventName: data.eventName,
          firstName: data.firstName,
          lastName: data.lastName,
          birthDate: data.birthDate ?? "2011-05-04",
          phone: "+420 777 123 456",
          pronouns: null,
          individualAccommodation: false,
          accommodationRequest: null,
          history: edits,
        })
      }
      if (path.endsWith("change-options")) {
        if (optionsState === "loading") return new Promise(() => undefined)
        if (optionsState === "error") return Promise.reject(new Error("Options unavailable"))
      }
      return Promise.resolve(
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
      )
    },
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

  it("shows an archived overpayment without payment or term change actions", async () => {
    renderDetail(
      application({
        terms: [{ ...confirmed, status: "ARCHIVED", archivedOverpaymentCzk: 600 }],
        amountPaidCzk: 5100,
        amountOwedCzk: -600,
        paymentStatus: "OVERPAID",
        paymentDetails: null,
      }),
    )
    expect(await screen.findByText("Archived")).toBeInTheDocument()
    expect(screen.getByText(/Overpaid/)).toHaveTextContent("600")
    expect(screen.queryByRole("button", { name: "Change terms" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Show payment QR/ })).not.toBeInTheDocument()
  })

  it("shows an archived application as a state without steps or step links", async () => {
    renderDetail(
      application({
        terms: [{ ...confirmed, status: "ARCHIVED" }],
        amountPaidCzk: 4500,
        amountOwedCzk: 0,
        paymentStatus: "PAID",
        paymentDetails: null,
      }),
    )
    expect(await screen.findByText("Archived")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Archived application" })).toBeInTheDocument()
    expect(
      screen.getAllByText("The term has ended, there is nothing left to arrange."),
    ).toHaveLength(1)
    expect(screen.queryByRole("link", { name: "Edit application" })).not.toBeInTheDocument()
    expect(screen.queryByText("Steps before the event")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Meals" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Health restriction" })).not.toBeInTheDocument()
    expect(screen.queryByText(/CZK|Kč/)).not.toBeInTheDocument()
  })

  it("keeps the edit button next to an archived term, which says it is over (#700)", async () => {
    renderDetail(
      application({
        terms: [confirmed, { ...waitlisted, status: "ARCHIVED" }],
      }),
    )
    const terms = await screen.findByRole("region", { name: "Terms" })
    expect(screen.getByRole("link", { name: "Edit application" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Archived application" })).not.toBeInTheDocument()
    expect(within(terms).getByText("Archived")).toBeInTheDocument()
    expect(
      within(terms).getByText("The term has ended, there is nothing left to arrange."),
    ).toBeInTheDocument()
  })

  it("gives an archived and a cancelled term each their own line (#700)", async () => {
    renderDetail(
      application({
        terms: [
          { ...confirmed, status: "ARCHIVED" },
          { ...waitlisted, status: "CANCELLED" },
        ],
      }),
    )
    const terms = await screen.findByRole("region", { name: "Terms" })
    expect(
      within(terms).getByText("The term has ended, there is nothing left to arrange."),
    ).toBeInTheDocument()
    expect(within(terms).getByText("You are not attending this term.")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Archived application" })).not.toBeInTheDocument()
  })

  it("copies the account and the summary variable symbol from the to-do card", async () => {
    const user = userEvent.setup()
    const write = vi.spyOn(navigator.clipboard, "writeText")
    renderDetail(application())
    const tasks = within(await screen.findByRole("region", { name: "Still to arrange" }))
    await user.click(tasks.getByRole("button", { name: "Copy account number" }))
    expect(write).toHaveBeenLastCalledWith("2900123456/2010")
    await user.click(tasks.getByRole("button", { name: "Copy variable symbol" }))
    expect(write).toHaveBeenLastCalledWith("48000")
  })

  beforeEach(() => {
    get.mockReset()
    put.mockReset()
    post.mockReset()
    vi.mocked(notify.success).mockClear()
    toDataURL.mockReset()
    toDataURL.mockResolvedValue("data:image/png;base64,AAAA")
  })

  it("changes the term from a dialog, shows the impact and confirms with a toast", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({
      json: () => Promise.resolve({ addedTerms: [{ termId: "t2", owedCzk: 4900 }] }),
    })
    renderDetail(application())

    const terms = await screen.findByRole("region", { name: "Terms" })
    expect(within(terms).getByRole("button", { name: "Cancel participation" })).toBeVisible()
    await user.click(await within(terms).findByRole("button", { name: "Change terms" }))
    const dialog = await screen.findByRole("dialog", { name: "Change term" })
    expect(within(dialog).getByRole("heading", { name: "Change impact" })).toBeInTheDocument()
    expect(within(dialog).getByText(/You paid CZK 2,000/)).toBeInTheDocument()
    expect(within(dialog).getByText("You will pay CZK 4,900 for the new term.")).toBeInTheDocument()
    expect(within(dialog).getByRole("combobox", { name: "New term" })).toBeInTheDocument()
    expect(within(dialog).getByText(/Paid money is not refunded automatically/)).toBeInTheDocument()
    // The kit's close cross is hard-coded English; the translated "Cancel" button closes the dialog.
    expect(within(dialog).queryByRole("button", { name: "Close" })).not.toBeInTheDocument()
    // Cancel and confirm sit side by side, in the footer of the dialog.
    const cancel = within(dialog).getByRole("button", { name: "Cancel" })
    const confirm = within(dialog).getByRole("button", { name: "Confirm change" })
    expect(cancel.parentElement).toBe(confirm.parentElement)
    await user.click(confirm)

    expect(put).toHaveBeenCalledWith("participant/applications/a1/terms", {
      json: { termIds: ["t2"] },
    })
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith("Term changed"))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(screen.queryByRole("heading", { name: "Term changed" })).not.toBeInTheDocument()
  })

  describe.each([true, false])("bed release with immediate cancellation %s", (isImmediate) => {
    it.each(["TO_EVALUATE", "WAITLISTED", "CONFIRMED"] as const)(
      "only announces a bed release for a confirmed removed term, status %s",
      async (status) => {
        const user = userEvent.setup()
        renderDetail(
          application({ terms: [{ ...confirmed, status }], paymentDetails: null }),
          isImmediate,
        )

        await user.click(await screen.findByRole("button", { name: "Cancel participation" }))
        const dialog = await screen.findByRole("dialog")
        await within(dialog).findByRole("heading", {
          name: isImmediate ? "Cancellation impact" : "Impact after approval",
        })
        if (status === "TO_EVALUATE") {
          expect(within(dialog).getByText("You don’t have a bed or a payment yet.")).toBeVisible()
        }
        const release = within(dialog).queryByText(/bed is released/)
        if (status === "CONFIRMED") expect(release).toBeVisible()
        else expect(release).not.toBeInTheDocument()
      },
    )

    it("does not announce release when only the unconfirmed term is removed", async () => {
      const user = userEvent.setup()
      renderDetail(application({ terms: [confirmed, waitlisted] }), isImmediate)

      await user.click(await screen.findByRole("button", { name: "Cancel participation" }))
      await user.click(await screen.findByRole("combobox", { name: "What do you want to cancel?" }))
      await user.click(screen.getByRole("option", { name: /Only 2. týden/ }))
      expect(
        within(screen.getByRole("dialog")).queryByText(/bed is released/),
      ).not.toBeInTheDocument()
    })
  })

  it.each(["loading", "error"] as const)(
    "closes the dialog using Cancel while %s",
    async (state) => {
      const user = userEvent.setup()
      renderDetail(application(), true, 4900, state)

      await user.click(await screen.findByRole("button", { name: "Change terms" }))
      const dialog = await screen.findByRole("dialog")
      if (state === "error") await within(dialog).findByRole("button", { name: "Try again" })
      expect(
        within(dialog).queryByRole("button", { name: "Confirm change" }),
      ).not.toBeInTheDocument()
      await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
      expect(put).not.toHaveBeenCalled()
      expect(post).not.toHaveBeenCalled()
    },
  )

  it("shows the price separately from zero debt for an unconfirmed term", async () => {
    const user = userEvent.setup()
    renderDetail(application(), true, 0)

    await user.click(await screen.findByRole("button", { name: "Change terms" }))
    expect(screen.getByText("You pay nothing for the new term.")).toBeInTheDocument()
  })

  it("closes the dialog without saving", async () => {
    const user = userEvent.setup()
    renderDetail(application())

    await user.click(await screen.findByRole("button", { name: "Change terms" }))
    const dialog = await screen.findByRole("dialog", { name: "Change term" })
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(put).not.toHaveBeenCalled()
    expect(notify.success).not.toHaveBeenCalled()
  })

  it("submits an approval request after cancellation starts and confirms with a toast", async () => {
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
    expect(screen.getByText("The organizer approves the request")).toBeInTheDocument()
    expect(screen.getByText("The bed is released only after approval.")).toBeInTheDocument()
    expect(screen.getByText("You will pay CZK 4,900 for the new term.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Send request" }))
    expect(post).toHaveBeenCalledWith("participant/applications/a1/change-requests", {
      json: { termIds: ["t2"] },
    })
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith("Term change request sent"))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("asks for a cancellation after cancellation starts and shows the impact after approval", async () => {
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
          requestedTermIds: [],
          status: "PENDING",
          rejectionReason: null,
          createdAt: "2026-11-05T14:30:00.000Z",
          reviewedAt: null,
          terms: [],
        }),
    })
    renderDetail(application(), false)
    await user.click(await screen.findByRole("button", { name: "Cancel participation" }))
    const dialog = await screen.findByRole("dialog", { name: "Request cancellation" })
    expect(
      within(dialog).getByRole("heading", { name: "Impact after approval" }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(/decides the cancellation fee and any refund/),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("The bed is released only after approval.")).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Send request" }))
    expect(post).toHaveBeenCalledWith("participant/applications/a1/change-requests", {
      json: { termIds: [] },
    })
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith("Cancellation request sent"))
  })

  it("cancels active terms while retaining the archived selection", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({ json: () => Promise.resolve({ addedTerms: [] }) })
    renderDetail(
      application({
        terms: [{ ...confirmed, status: "ARCHIVED" }, secondConfirmed],
        paymentDetails: null,
      }),
    )
    await user.click(await screen.findByRole("button", { name: "Cancel participation" }))
    await user.click(screen.getByRole("button", { name: "Confirm cancellation" }))
    expect(put).toHaveBeenCalledWith("participant/applications/a1/terms", {
      json: { termIds: ["t1"] },
    })
  })

  it("cancels one term and shows its payment and bed impact before confirmation", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({ json: () => Promise.resolve({ addedTerms: [] }) })
    renderDetail(withTerms([termPayment(1, 4500, 4500, "PAID")]))

    await user.click(await screen.findByRole("button", { name: "Cancel participation" }))
    await user.click(screen.getByRole("combobox", { name: "What do you want to cancel?" }))
    await user.click(screen.getByRole("option", { name: /Only 1. týden/ }))
    expect(screen.getByText("You paid CZK 4,500.")).toBeInTheDocument()
    expect(screen.getByText(/Paid money is not refunded automatically/)).toBeInTheDocument()
    expect(screen.getByText("Your bed is released immediately.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Confirm cancellation" }))
    expect(put).toHaveBeenCalledWith("participant/applications/a1/terms", {
      json: { termIds: ["t2"] },
    })
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith("Term cancelled"))
  })

  it.each([
    ["Cancel participation", "You haven’t paid anything yet, so there is nothing to settle."],
    ["Change terms", "You haven’t paid anything yet."],
  ])("shows debt removed by %s for an unpaid confirmed term", async (open, impact) => {
    const user = userEvent.setup()
    renderDetail(withTerms([termPayment(1, 4500, 0, "UNPAID")], [confirmed]))

    await user.click(await screen.findByRole("button", { name: open }))
    expect(screen.getByText(impact)).toBeInTheDocument()
    expect(screen.queryByText(/No payment impact/)).not.toBeInTheDocument()
  })

  it("puts the participant in the title and the event with the application code under it", async () => {
    renderDetail(application())

    expect(
      await screen.findByRole("heading", { level: 1, name: "Jana Nováková" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Letní kemp 2027 · application LKL-0048")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to my applications" })).toHaveAttribute(
      "href",
      "/participant",
    )
  })

  it("puts the debt with the account, the summary symbol and the QR in the to-do card, once", async () => {
    const user = userEvent.setup()
    renderDetail(application())

    const card = await screen.findByRole("region", { name: "Still to arrange" })
    const tasks = within(card)
    expect(tasks.getByText("Pay CZK 2,500")).toBeInTheDocument()
    expect(tasks.getByText(/^1\. týden · due /)).toBeInTheDocument()
    expect(tasks.getByText("2900123456/2010")).toBeInTheDocument()
    expect(tasks.getByText("48000")).toBeInTheDocument()
    // Every fact once: the term symbol and the debt are not repeated in the terms.
    expect(screen.queryByText("48001")).not.toBeInTheDocument()
    expect(screen.getAllByText(/2,500/)).toHaveLength(1)

    await user.click(tasks.getByRole("button", { name: "Show QR code" }))
    expect(
      await tasks.findByRole("img", { name: "QR code for the combined payment" }),
    ).toBeVisible()
    expect(tasks.getByRole("button", { name: "Hide QR code" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  it("sums the debts of both confirmed terms into one task (500 + 700 CZK)", async () => {
    renderDetail(
      withTerms([
        termPayment(1, 4900, 4400, "PARTIALLY_PAID"),
        termPayment(2, 5600, 4900, "PARTIALLY_PAID"),
      ]),
    )

    const tasks = within(await screen.findByRole("region", { name: "Still to arrange" }))
    expect(tasks.getByText("Pay CZK 1,200")).toBeInTheDocument()
    expect(tasks.getByText(/^1\. týden · 2\. týden · due /)).toBeInTheDocument()
  })

  it.each(["", "invalid-account"])(
    "shows the summary symbol but no QR for unusable account %s",
    async (bankAccount) => {
      const data = application()
      renderDetail({ ...data, paymentDetails: { ...data.paymentDetails!, bankAccount } })

      expect(await screen.findByText("48000")).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Show QR code" })).not.toBeInTheDocument()
      expect(toDataURL).not.toHaveBeenCalled()
    },
  )

  it("has no to-do card once everything is paid", async () => {
    renderDetail(withTerms([termPayment(1, 4500, 4500, "PAID")], [confirmed]))

    await screen.findByRole("region", { name: "Terms" })
    expect(screen.queryByRole("region", { name: "Still to arrange" })).not.toBeInTheDocument()
  })

  it("keeps the overpayment of a term in the terms, not in a task", async () => {
    renderDetail(
      withTerms([termPayment(1, 4500, 5000, "OVERPAID"), termPayment(2, 4900, 0, "UNPAID")]),
    )

    const terms = within(await screen.findByRole("region", { name: "Terms" }))
    expect(
      terms.getByText(
        "Overpaid · CZK 500. Arrange the refund of the overpayment with the organizer.",
      ),
    ).toBeInTheDocument()
    const tasks = within(screen.getByRole("region", { name: "Still to arrange" }))
    expect(tasks.getByText("Pay CZK 4,900")).toBeInTheDocument()
    expect(tasks.getByText("An overpayment is not carried over between terms.")).toBeInTheDocument()
  })

  it("shows the price of a confirmed term only, with the status of every term", async () => {
    renderDetail(application({ terms: [confirmed, waitlisted] }))

    const terms = within(await screen.findByRole("region", { name: "Terms" }))
    expect(terms.getByText("Confirmed")).toBeInTheDocument()
    expect(terms.getByText("CZK 4,500")).toBeInTheDocument()
    expect(terms.getByText("Waitlisted")).toBeInTheDocument()
    expect(terms.queryByText("CZK 4,900")).not.toBeInTheDocument()
    expect(
      terms.getByText(
        "If no bed becomes free before the term starts, the application for this term will be cancelled.",
      ),
    ).toBeInTheDocument()
    expect(terms.queryByText(/place in line/i)).not.toBeInTheDocument()
  })

  it("shows a term to evaluate as awaiting evaluation, never as waitlisted (US-102)", async () => {
    renderDetail(
      application({ terms: [{ ...confirmed, status: "TO_EVALUATE" }], paymentDetails: null }),
    )

    const terms = within(await screen.findByRole("region", { name: "Terms" }))
    expect(terms.getByText("Awaiting evaluation")).toBeInTheDocument()
    expect(terms.queryByText("Waitlisted")).not.toBeInTheDocument()
    expect(
      terms.getByText("The organizer will assess your application. Don't pay yet."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Still to arrange" })).not.toBeInTheDocument()
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

  it("shows the persisted phone, accommodation and author on a fresh detail visit", async () => {
    renderDetail(application(), true, 4900, undefined, [
      {
        id: "change1",
        authorName: "Eva Malá",
        createdAt: "2026-11-05T13:30:00Z",
        changedFields: ["phone", "individualAccommodation"],
      },
    ])
    expect(await screen.findByRole("heading", { name: "Change history" })).toBeVisible()
    expect(screen.getByText("+420 777 123 456")).toBeVisible()
    expect(screen.getByRole("heading", { name: "Accommodation request" })).toBeVisible()
    expect(screen.getByText("No individual accommodation requested.")).toBeVisible()
    expect(screen.getByText(/Eva Malá/)).toBeVisible()
    expect(screen.getByText("Updated contact and accommodation request.")).toBeVisible()
    expect(screen.queryByText(/organizer was notified/i)).not.toBeInTheDocument()
  })

  describe("payment simulation (US-115)", () => {
    it("shows no simulation where the backend does not offer it (production)", async () => {
      renderDetail(application())

      await screen.findByRole("region", { name: "Still to arrange" })
      expect(screen.queryByRole("button", { name: "I paid" })).toBeNull()
      expect(screen.queryByText("Demo: payments are simulated.")).toBeNull()
    })

    it("simulates the payment of one term and lists it", async () => {
      post.mockReset()
      post.mockResolvedValue({})
      const user = userEvent.setup()
      renderDetail(
        application({
          canSimulatePayment: true,
          simulatedPayments: [
            { termId: "t1", amountCzk: 2500, createdAt: "2027-01-01T10:00:00.000Z" },
          ],
        }),
      )

      expect(
        await screen.findByRole("heading", { name: "Simulated payment history" }),
      ).toBeVisible()
      expect(screen.queryByText("Demo: payments are simulated.")).toBeNull()
      expect(
        screen.getByText(
          "Test payments created with the “I paid” button. These are not actual bank transfers.",
        ),
      ).toBeVisible()
      expect(screen.getByText(/\+CZK 2,500 · .* · source: simulation/)).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "I paid" }))

      expect(post).toHaveBeenCalledWith("participant/applications/a1/payments/simulation", {
        json: { termId: "t1" },
      })
    })

    it("marks the term button busy while its simulated payment is pending", async () => {
      post.mockReturnValue(new Promise(() => undefined))
      const user = userEvent.setup()
      renderDetail(application({ canSimulatePayment: true }))
      const button = await screen.findByRole("button", { name: "I paid" })
      await user.click(button)
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute("aria-busy", "true")
    })

    it("reports a failed simulation and retries only that term", async () => {
      post.mockRejectedValueOnce(new Error("Request failed")).mockResolvedValueOnce({})
      const user = userEvent.setup()
      renderDetail(application({ canSimulatePayment: true }))

      await user.click(await screen.findByRole("button", { name: "I paid" }))
      expect(await screen.findByText("The simulated payment could not be recorded.")).toBeVisible()
      await user.click(screen.getByRole("button", { name: "Try again" }))

      expect(post).toHaveBeenCalledTimes(2)
      expect(post).toHaveBeenNthCalledWith(2, "participant/applications/a1/payments/simulation", {
        json: { termId: "t1" },
      })
      await waitFor(() => {
        expect(screen.queryByText("The simulated payment could not be recorded.")).toBeNull()
      })
    })

    it("offers no button for a term with nothing left to pay", async () => {
      renderDetail({
        ...withTerms([termPayment(1, 4500, 4500, "PAID")], [confirmed]),
        canSimulatePayment: true,
      })

      await screen.findByRole("region", { name: "Terms" })
      expect(screen.queryByRole("button", { name: "I paid" })).toBeNull()
    })
  })

  describe("before the event (US-149)", () => {
    const before = async () =>
      within(await screen.findByRole("region", { name: "Before the event" }))

    it("says whether meals and health are filled in and links to them", async () => {
      renderDetail(application({ mealsDecided: true }))

      const section = await before()
      expect(section.getByRole("link", { name: /^Meals/ })).toHaveTextContent("Filled in")
      expect(section.getByRole("link", { name: /^Health restriction/ })).toHaveTextContent(
        "Not filled in",
      )
      expect(section.getByRole("link", { name: "Program" })).toBeVisible()
    })

    it("puts a transport still to choose in the to-do card and a chosen one here", async () => {
      renderDetail(
        application({
          terms: [
            { ...confirmed, transportOffered: true },
            { ...secondConfirmed, transportOffered: true, transportDecided: true },
          ],
          paymentDetails: null,
        }),
      )

      const tasks = within(await screen.findByRole("region", { name: "Still to arrange" }))
      expect(tasks.getByRole("link", { name: /^Choose transport/ })).toHaveAttribute(
        "href",
        "/participant/applications/a1/transport#transport-t1",
      )
      expect((await before()).getByRole("link", { name: /^Transport/ })).toHaveTextContent(
        "2. týden · Chosen",
      )
    })

    it("hides the transport and meals once the term is over (D-192)", async () => {
      renderDetail(
        application({
          terms: [{ ...confirmed, transportOffered: true, termEditable: false }],
          mealsEditable: false,
          paymentDetails: null,
        }),
      )

      const section = await before()
      expect(section.queryByRole("link", { name: /^Meals/ })).not.toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /transport/i })).not.toBeInTheDocument()
      expect(section.getByRole("link", { name: /^Health restriction/ })).toBeVisible()
    })

    it.each(["TO_EVALUATE", "WAITLISTED", "CANCELLED"] as const)(
      "keeps meals and health but no program for a %s term",
      async (status) => {
        renderDetail(
          application({
            terms: [{ ...confirmed, status, transportOffered: true }],
            paymentDetails: null,
          }),
        )

        const section = await before()
        expect(section.getByRole("link", { name: /^Meals/ })).toBeVisible()
        expect(section.getByRole("link", { name: /^Health restriction/ })).toBeVisible()
        expect(section.queryByRole("link", { name: "Program" })).not.toBeInTheDocument()
        expect(screen.queryByRole("region", { name: "Still to arrange" })).not.toBeInTheDocument()
      },
    )

    it("shows a cancelled term in the terms with its status and a line of text", async () => {
      renderDetail(
        application({
          terms: [{ ...confirmed, status: "CANCELLED" }],
          paymentDetails: null,
        }),
      )

      const terms = within(await screen.findByRole("region", { name: "Terms" }))
      expect(terms.getByText("Cancelled")).toBeVisible()
      expect(terms.getByText("You are not attending this term.")).toBeVisible()
    })
  })
})
