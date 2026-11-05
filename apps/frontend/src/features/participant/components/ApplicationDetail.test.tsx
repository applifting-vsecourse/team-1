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

const { get, put, toDataURL } = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  toDataURL: vi.fn(),
}))
vi.mock("@/lib/api-client", () => ({ api: { get, put } }))
vi.mock("qrcode", () => ({ default: { toDataURL } }))

const confirmed = {
  termId: "t1",
  name: "1. týden",
  startsOn: "2027-07-04",
  endsOn: "2027-07-10",
  status: "CONFIRMED" as const,
  priceCzk: 4500,
}
const waitlisted = {
  termId: "t2",
  name: "2. týden",
  startsOn: "2027-07-11",
  endsOn: "2027-07-17",
  status: "WAITLISTED" as const,
  priceCzk: 4900,
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

const renderDetail = (data: MyApplication, canChangeImmediately = true) => {
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path.endsWith("change-options")
          ? {
              canChangeImmediately,
              terms: [
                {
                  id: "t1",
                  name: "1. týden",
                  startsOn: "2027-07-04",
                  endsOn: "2027-07-10",
                  selected: true,
                },
                {
                  id: "t2",
                  name: "2. týden",
                  startsOn: "2027-07-11",
                  endsOn: "2027-07-17",
                  selected: false,
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
    toDataURL.mockReset()
    toDataURL.mockResolvedValue("data:image/png;base64,AAAA")
  })

  it("lets the participant immediately change the selected terms", async () => {
    const user = userEvent.setup()
    put.mockResolvedValue(undefined)
    renderDetail(application())

    await user.click(await screen.findByRole("button", { name: "Change terms or cancel" }))
    expect(screen.getByText(/Payments stay with their original terms/)).toBeInTheDocument()
    await user.click(screen.getByRole("checkbox", { name: "Select term 2. týden" }))
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(put).toHaveBeenCalledWith("participant/applications/a1/terms", {
      json: { termIds: ["t1", "t2"] },
    })
  })

  it("does not offer an immediate change after cancellation starts", async () => {
    renderDetail(application(), false)
    expect(
      await screen.findByText(/Changes now require the organiser's approval/),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Change terms or cancel" })).not.toBeInTheDocument()
  })

  it("shows what is due, what is paid, what is left and where to send it for the term", async () => {
    renderDetail(application())

    expect(
      await screen.findByRole("heading", { level: 1, name: "Letní kemp 2027" }),
    ).toBeInTheDocument()
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
            },
            {
              termId: "t2",
              termNumber: 2,
              variableSymbol: "48002",
              dueCzk: 4900,
              paidCzk: 4200,
              owedCzk: 700,
              paymentStatus: "PARTIALLY_PAID",
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
    expect(within(dialog).getByText("Combined payment breakdown")).toBeInTheDocument()
    expect(
      within(dialog).getByText(/Use the summary variable symbol for both confirmed terms/),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        (_, element) =>
          element?.tagName === "P" && /Breakdown: 4–10 Jul.*500/.test(element.textContent ?? ""),
      ),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        (_, element) =>
          element?.tagName === "P" && /11–17 Jul.*700/.test(element.textContent ?? ""),
      ),
    ).toBeInTheDocument()
    expect(toDataURL).toHaveBeenCalledWith(
      expect.stringMatching(/^SPD\*1\.0\*ACC:CZ\d{22}\*AM:1200\.00\*CC:CZK\*X-VS:48000$/),
      { width: 200, margin: 2 },
    )
    expect(
      await within(dialog).findByRole("img", { name: "QR code for the combined payment" }),
    ).toHaveAttribute("src", "data:image/png;base64,AAAA")
  })
})
