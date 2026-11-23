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
import { NetworkError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PaymentApplication } from "@/features/event-overview/api/payments"
import { PaymentDetail } from "@/features/event-overview/components/PaymentDetail"

const { get, remove, post, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  remove: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get, delete: remove, post, patch },
}))

type TermInput = {
  id: string
  number: number
  startsOn: string
  endsOn: string
  status: PaymentApplication["terms"][number]["status"]
  priceCzk: number
  paidCzk: number
}
const first: TermInput = {
  id: "t1",
  number: 1,
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  status: "CONFIRMED",
  priceCzk: 4900,
  paidCzk: 0,
}
const second: TermInput = {
  id: "t2",
  number: 2,
  startsOn: "2027-07-19",
  endsOn: "2027-07-25",
  status: "CONFIRMED",
  priceCzk: 5600,
  paidCzk: 0,
}

/** A term as the API sends it: every amount follows from the price, the status and what is paid. */
const term = (input: TermInput): PaymentApplication["terms"][number] => {
  const dueCzk = input.status === "CONFIRMED" ? input.priceCzk : 0
  const owedCzk = dueCzk - input.paidCzk
  const paymentStatus =
    dueCzk === 0 && input.paidCzk === 0
      ? "NOTHING_DUE"
      : owedCzk < 0
        ? "OVERPAID"
        : owedCzk === 0
          ? "PAID"
          : input.paidCzk === 0
            ? "UNPAID"
            : "PARTIALLY_PAID"
  return {
    termId: input.id,
    termNumber: input.number,
    name: null,
    variableSymbol: String(12000 + input.number),
    status: input.status,
    priceCzk: input.priceCzk,
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    dueCzk,
    paidCzk: input.paidCzk,
    owedCzk,
    refundableCzk: Math.max(0, -owedCzk),
    paymentStatus,
    paymentDueAt: null,
  }
}

const receipt = (id: string, createdAt: string, rows: { termId: string; amountCzk: number }[]) => ({
  id,
  amountCzk: rows.reduce((sum, row) => sum + row.amountCzk, 0),
  createdAt,
  recordedByName: "Eva",
  cancelledAt: null,
  correctsReceiptId: null,
  isSummary: rows.length > 1,
  rows,
})

const application = (
  inputs: TermInput[],
  payments: PaymentApplication["payments"] = [],
): PaymentApplication => {
  const terms = inputs.map(term)
  const amountDueCzk = terms.reduce((sum, item) => sum + item.dueCzk, 0)
  const amountPaidCzk = terms.reduce((sum, item) => sum + item.paidCzk, 0)
  return {
    id: "a1",
    eventId: "e1",
    eventName: "Camp",
    firstName: "Adam",
    lastName: "Test",
    individualAccommodation: false,
    accommodationRequest: null,
    code: "C-0047",
    birthDate: "2011-05-04",
    gender: "MALE",
    email: "eva.mala@example.cz",
    phone: "+420777123456",
    isEditable: true,
    bankAccount: "123456789/0000",
    amountDueCzk,
    amountPaidCzk,
    amountOwedCzk: amountDueCzk - amountPaidCzk,
    refundableTermId: terms.find((item) => item.refundableCzk > 0)?.termId ?? null,
    payableCzk: terms.reduce((sum, item) => sum + Math.max(0, item.owedCzk), 0),
    terms,
    payments,
  }
}

const historyItems = () =>
  within(screen.getByRole("list", { name: "Payment history" })).getAllByRole("listitem")
const historyItem = (text: RegExp) => historyItems().find((item) => text.test(item.textContent))!

function setup() {
  const root = createRootRoute({ component: () => <PaymentDetail applicationId="a1" /> })
  const route = createRoute({ getParentRoute: () => root, path: "/" })
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}
const respondWith = (data: () => PaymentApplication) =>
  get.mockReturnValue({ json: () => Promise.resolve(data()) })
const card = (dates: string): HTMLElement =>
  screen.getByRole("heading", { name: new RegExp(dates) }).closest("[data-slot='card']")!

beforeEach(() => {
  vi.clearAllMocks()
  post.mockReturnValue({
    json: () =>
      Promise.resolve({
        amountOwedCzk: 999,
        terms: [
          { termId: "t1", owedCzk: 777, changeCzk: 500 },
          { termId: "t2", owedCzk: 222, changeCzk: -700 },
        ],
      }),
  })
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {
        return undefined
      }
      unobserve() {
        return undefined
      }
      disconnect() {
        return undefined
      }
    },
  )
})

describe("PaymentDetail", () => {
  it("shows the applicant's request for individual accommodation and its note (US-38)", async () => {
    respondWith(() => ({
      ...application([first]),
      individualAccommodation: true,
      accommodationRequest: "Ground floor, please.",
    }))
    setup()

    expect(await screen.findByRole("heading", { name: "Individual accommodation" })).toBeVisible()
    const card = within(screen.getByRole("group", { name: "Individual accommodation" }))
    expect(card.getByText("Note")).toBeVisible()
    expect(card.queryByText("Request")).not.toBeInTheDocument()
    expect(card.getByText("Ground floor, please.")).toBeVisible()
  })

  it("hides the individual accommodation block when there is no request (#544)", async () => {
    respondWith(() => application([first]))
    setup()

    expect(await screen.findByRole("group", { name: "Participant details" })).toBeVisible()
    expect(
      screen.queryByRole("heading", { name: "Individual accommodation" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("group", { name: "Individual accommodation" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/no request for individual accommodation/)).not.toBeInTheDocument()
  })

  it("shows the participant's date of birth, gender and the applicant's contact", async () => {
    respondWith(() => application([first]))
    setup()

    const details = await screen.findByRole("group", { name: "Participant details" })
    expect(within(details).getByText("Date of birth").parentElement).toHaveTextContent(
      "Date of birth · 4 May 2011",
    )
    expect(within(details).getByText("Gender").parentElement).toHaveTextContent("Gender · Male")
    expect(within(details).getByText("Applicant")).toBeInTheDocument()
    expect(within(details).getByText(/eva\.mala@example\.cz/)).toBeInTheDocument()
    expect(within(details).getByText(/\+420777123456/)).toBeInTheDocument()
  })

  it("says the phone is not provided when the application has none (#515)", async () => {
    respondWith(() => ({ ...application([first]), phone: null }))
    setup()

    const details = await screen.findByRole("group", { name: "Participant details" })
    expect(within(details).getByText(/No phone provided/)).toBeInTheDocument()
  })

  it("offers the edit button only while the application can be edited (#515)", async () => {
    respondWith(() => application([first]))
    setup()
    const details = await screen.findByRole("group", { name: "Participant details" })
    expect(within(details).getByRole("button", { name: "Edit" })).toBeVisible()
  })

  it("hides the edit button when the application can no longer be edited (#515)", async () => {
    respondWith(() => ({ ...application([first]), isEditable: false }))
    setup()
    const details = await screen.findByRole("group", { name: "Participant details" })
    expect(within(details).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
  })

  it("prefills a payment correction and submits the replacement for a different term", async () => {
    respondWith(() =>
      application(
        [{ ...first, paidCzk: 500 }, second],
        [receipt("p1", "2027-03-10T12:00:00Z", [{ termId: "t1", amountCzk: 500 }])],
      ),
    )
    patch.mockResolvedValue(undefined)
    setup()
    const user = userEvent.setup()
    await user.click(
      within(await screen.findByRole("list", { name: "Payment history" })).getByRole("button", {
        name: "Edit",
      }),
    )
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("textbox", { name: "New amount *" })).toHaveValue("500")
    expect(within(dialog).getByText("Nothing changes yet.")).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Save correction" })).toBeDisabled()
    await user.clear(within(dialog).getByRole("textbox", { name: "New amount *" }))
    await user.type(within(dialog).getByRole("textbox", { name: "New amount *" }), "600")
    expect(await within(dialog).findByText(/to.*777/)).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith(
      "organizer/applications/a1/payments/p1/preview",
      expect.objectContaining({ json: { amountCzk: 600, termId: "t1" } }),
    )
    await user.clear(within(dialog).getByRole("textbox", { name: "New amount *" }))
    await user.type(within(dialog).getByRole("textbox", { name: "New amount *" }), "700")
    await user.click(within(dialog).getByRole("combobox", { name: "Term *" }))
    await user.click(screen.getByRole("option", { name: /19–25 Jul 2027/ }))
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Save correction" })).toBeEnabled(),
    )
    await user.click(within(dialog).getByRole("button", { name: "Save correction" }))
    await waitFor(() => expect(patch).toHaveBeenCalledOnce())
    const [url, options] = patch.mock.calls[0] as [
      string,
      { json: { requestId: string; amountCzk: number; termId: string } },
    ]
    expect(url).toBe("organizer/applications/a1/payments/p1")
    expect(options.json).toMatchObject({ amountCzk: 700, termId: "t2" })
    expect(options.json.requestId).toMatch(/[0-9a-f-]{36}/)
    expect(await screen.findByText("Correction saved.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "System record" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Back to payments" }))
    expect(screen.getByRole("list", { name: "Payment history" })).toBeInTheDocument()
  })

  it("reloads payment history without previewing the cancelled original after a lost correction response", async () => {
    const original = receipt("p1", "2027-03-10T12:00:00Z", [{ termId: "t1", amountCzk: 500 }])
    const data = application([{ ...first, paidCzk: 500 }], [original])
    let isCommitted = false
    get.mockImplementation((path: string) => ({
      json: () => {
        if (!path.endsWith("/payments")) return Promise.resolve([])
        return Promise.resolve(
          isCommitted
            ? { ...data, payments: [{ ...original, cancelledAt: "2027-03-11T08:00:00Z" }] }
            : data,
        )
      },
    }))
    post.mockImplementation(() => ({
      json: () =>
        isCommitted
          ? Promise.reject(new Error("Cannot preview a cancelled receipt"))
          : Promise.resolve({
              amountOwedCzk: 4400,
              terms: [{ termId: "t1", owedCzk: 4400, changeCzk: 0 }],
            }),
    }))
    patch.mockImplementation(() => {
      isCommitted = true
      return Promise.reject(new NetworkError(new Request("https://example.test/payment")))
    })
    setup()
    const user = userEvent.setup()
    await user.click(
      within(await screen.findByRole("list", { name: "Payment history" })).getByRole("button", {
        name: "Edit",
      }),
    )
    const dialog = within(screen.getByRole("dialog"))
    await user.clear(dialog.getByRole("textbox", { name: "New amount *" }))
    await user.type(dialog.getByRole("textbox", { name: "New amount *" }), "400")
    const save = dialog.getByRole("button", { name: "Save correction" })
    await waitFor(() => expect(save).toBeEnabled())
    const previews = post.mock.calls.length
    await user.click(save)
    await user.click(await dialog.findByRole("button", { name: "Refresh history" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(patch).toHaveBeenCalledOnce()
    expect(post).toHaveBeenCalledTimes(previews)
    expect(
      get.mock.calls.filter(([path]) => path === "organizer/applications/a1/payments"),
    ).toHaveLength(2)
  })

  it("previews the remaining overpayment when correcting a refund", async () => {
    post.mockReturnValue({
      json: () =>
        Promise.resolve({
          amountOwedCzk: -300,
          terms: [{ termId: "t1", owedCzk: -300, changeCzk: -200 }],
        }),
    })
    respondWith(() =>
      application(
        [{ ...first, paidCzk: 5000 }],
        [receipt("r1", "2027-03-10T12:00:00Z", [{ termId: "t1", amountCzk: -400 }])],
      ),
    )
    setup()
    const user = userEvent.setup()
    await user.click(
      within(await screen.findByRole("list", { name: "Payment history" })).getByRole("button", {
        name: "Edit",
      }),
    )
    const dialog = screen.getByRole("dialog")
    const amount = within(dialog).getByRole("textbox", { name: "New amount *" })
    await user.clear(amount)
    await user.type(amount, "200")
    expect(dialog).toHaveTextContent(/Overpayment for this term after correction:.*300/)
  })

  it("marks the original as corrected and offers actions only on the replacement", async () => {
    const original = {
      ...receipt("p1", "2027-03-10T12:00:00Z", [{ termId: "t1", amountCzk: 500 }]),
      cancelledAt: "2027-03-11T12:00:00Z",
    }
    const replacement = {
      ...receipt("p2", "2027-03-11T12:00:00Z", [{ termId: "t1", amountCzk: 700 }]),
      correctsReceiptId: "p1",
    }
    respondWith(() => application([{ ...first, paidCzk: 700 }, second], [original, replacement]))
    setup()
    expect(await screen.findByText("Corrected · original entry")).toBeInTheDocument()
    expect(screen.getByText("Correction")).toBeInTheDocument()
    expect(
      within(screen.getByRole("list", { name: "Payment history" })).getAllByRole("button", {
        name: "Edit",
      }),
    ).toHaveLength(1)
  })

  it("shows the debt of each term separately, with its own variable symbol (500 + 700 CZK)", async () => {
    respondWith(() =>
      application([
        { ...first, paidCzk: 4400 },
        { ...second, paidCzk: 4900 },
      ]),
    )
    setup()

    const one = await screen.findByRole("heading", { name: /12–18 Jul 2027/ })
    const whole = within(screen.getByRole("group", { name: "Whole application" }))
    expect(whole.getByText("Left to pay").nextSibling).toHaveTextContent("1,200")
    expect(whole.queryByText("Overpayment")).toBeNull()
    expect(screen.getByRole("button", { name: "Record overpayment refund" })).toBeDisabled()
    expect(
      screen.getByText("A refund cannot be recorded: no term has an overpayment."),
    ).toBeVisible()
    const cardOne = one.closest<HTMLElement>("[data-slot='card']")!
    const cardTwo = card("19–25 Jul 2027")
    expect(within(cardOne).getByText("Partly paid")).toBeInTheDocument()
    expect(within(cardOne).getAllByText("Left to pay")[0]?.nextSibling).toHaveTextContent("500")
    expect(within(cardOne).getByText("12001")).toBeInTheDocument()
    expect(within(cardTwo).getAllByText("Left to pay")[0]?.nextSibling).toHaveTextContent("700")
    expect(within(cardTwo).getByText("12002")).toBeInTheDocument()
    expect(within(cardTwo).getByText("123456789/0000")).toBeInTheDocument()
    // One button per term with a debt, and one for the whole application under the cards.
    expect(screen.getAllByRole("button", { name: "Record payment for the term" })).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Record payment" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Record refund" })).toBeNull()
  })

  it("keeps a paid term collapsed and puts the debt on the term confirmed later", async () => {
    respondWith(() =>
      application(
        [
          { ...first, paidCzk: 4900 },
          { ...second, status: "WAITLISTED" },
        ],
        [receipt("p1", "2027-03-10T12:00:00Z", [{ termId: "t1", amountCzk: 4900 }])],
      ),
    )
    setup()
    expect(await screen.findByRole("button", { name: /12–18 Jul 2027,\s?Paid/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    expect(screen.getByText("19–25 Jul 2027 · Waitlisted")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Record payment for the term" })).toBeNull()
  })

  it("lists the term confirmed later, with its debt, before the paid one", async () => {
    // The first term is paid; the second was confirmed afterwards, so the debt is only on it.
    respondWith(() =>
      application(
        [{ ...first, paidCzk: 4900 }, { ...second }],
        [receipt("p1", "2027-03-10T12:00:00Z", [{ termId: "t1", amountCzk: 4900 }])],
      ),
    )
    setup()
    const paid = await screen.findByRole("button", { name: /12–18 Jul 2027,\s?Paid/ })
    const unpaid = screen.getByRole("heading", { name: /19–25 Jul 2027/ })
    expect(
      within(card("19–25 Jul 2027")).getAllByText("Left to pay")[0]?.nextSibling,
    ).toHaveTextContent("5,600")
    expect(screen.getAllByRole("button", { name: "Record payment for the term" })).toHaveLength(1)
    expect(unpaid.compareDocumentPosition(paid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("collapses both terms when each is paid and records nothing more", async () => {
    respondWith(() =>
      application([
        { ...first, paidCzk: 4900 },
        { ...second, paidCzk: 5600 },
      ]),
    )
    setup()
    const toggles = await screen.findAllByRole("button", { name: /Paid/ })
    expect(toggles).toHaveLength(2)
    toggles.forEach((toggle) => expect(toggle).toHaveAttribute("aria-expanded", "false"))
    expect(screen.queryByRole("button", { name: "Record payment for the term" })).toBeNull()
  })

  it("records a payment for the chosen term only", async () => {
    respondWith(() =>
      application([
        { ...first, paidCzk: 4400 },
        { ...second, paidCzk: 4900 },
      ]),
    )
    post.mockResolvedValue(undefined)
    setup()
    const user = userEvent.setup()
    await screen.findByRole("heading", { name: /12–18 Jul 2027/ })

    await user.click(
      within(card("19–25 Jul 2027")).getByRole("button", { name: "Record payment for the term" }),
    )
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveTextContent("19–25 Jul 2027")
    expect(dialog).toHaveTextContent(/Left to pay.*700/)
    await user.click(within(dialog).getByRole("button", { name: "Record payment" }))

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("organizer/applications/a1/payments", {
        json: { requestId: expect.any(String) as unknown, amountCzk: 700, termId: "t2" },
      }),
    )
  })

  it("shows nothing due, no card to pay and no record button without a confirmed term", async () => {
    respondWith(() => application([{ ...first, status: "WAITLISTED" }]))
    setup()
    expect(await screen.findByText("Nothing due yet")).toBeInTheDocument()
    expect(screen.getByText("12–18 Jul 2027 · Waitlisted")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Record payment/ })).not.toBeInTheDocument()
  })

  it("records one summary payment for an unpaid application without choosing a term", async () => {
    respondWith(() => application([first, second]))
    post.mockResolvedValue(undefined)
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Record payment" }))
    expect(screen.getByRole("combobox", { name: "Term" })).toHaveTextContent(
      "Whole application (summary)",
    )
    await user.click(screen.getByRole("radio", { name: "Refund" }))
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled()
    await user.click(screen.getByRole("radio", { name: "Payment" }))
    await user.click(screen.getByRole("button", { name: "Record payment" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(post).toHaveBeenCalledWith("organizer/applications/a1/payments", {
      json: { requestId: expect.any(String) as unknown, amountCzk: 10500 },
    })
  })

  it("shows no payments and links back to the correct event's applications", async () => {
    respondWith(() => application([first]))
    setup()
    expect(await screen.findByRole("heading", { name: "Adam Test" })).toBeInTheDocument()
    expect(screen.getByText(/application C-0047/)).toBeInTheDocument()
    expect(screen.getByText("No payment recorded yet.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to applications" })).toHaveAttribute(
      "href",
      "/organizer/events/e1/applications",
    )
  })

  it("lists the history per term with the date, term, method, amount and author", async () => {
    respondWith(() =>
      application(
        [
          { ...first, paidCzk: 4400 },
          { ...second, paidCzk: 4900 },
        ],
        [
          receipt("p1", "2027-05-04T12:00:00Z", [
            { termId: "t1", amountCzk: 2400 },
            { termId: "t2", amountCzk: 4900 },
          ]),
          receipt("p2", "2027-05-18T12:00:00Z", [{ termId: "t1", amountCzk: 2000 }]),
        ],
      ),
    )
    setup()
    await screen.findByRole("list", { name: "Payment history" })

    const rows = historyItems()
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent(/Payment · CZK 2,400/)
    expect(rows[0]).toHaveTextContent(/12–18 Jul 2027/)
    expect(rows[1]).toHaveTextContent(/19–25 Jul 2027/)
    expect(rows[1]).toHaveTextContent(/4,900/)
    expect(rows[2]).toHaveTextContent(/2,000/)
    expect(rows[2]).toHaveTextContent(/Recorded by Eva · 18 May 2027/)
  })

  it("shows the date and every affected term before cancelling a split receipt", async () => {
    const split = receipt("split", "2027-03-12T12:00:00Z", [
      { termId: "t1", amountCzk: 400 },
      { termId: "t2", amountCzk: 800 },
    ])
    respondWith(() =>
      application(
        [
          { ...first, paidCzk: 400 },
          { ...second, paidCzk: 800 },
        ],
        [split],
      ),
    )
    setup()
    const user = userEvent.setup()
    await screen.findByRole("list", { name: "Payment history" })
    const row = historyItem(/400/)
    await user.click(within(row).getByRole("button", { name: "Cancel record" }))
    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: /Receipt dated.*12 Mar 2027/ }),
    ).toBeVisible()
    expect(within(dialog).getByText(/^Total/)).toHaveTextContent(/1,200/)
    expect(within(dialog).getByText(/original record remains visible in the history/)).toBeVisible()
    const parts = within(dialog).getAllByRole("listitem")
    expect(parts).toHaveLength(2)
    expect(parts[0]).toHaveTextContent(/400/)
    expect(parts[1]).toHaveTextContent(/800/)
    expect(
      within(dialog).getByText(
        "If the receipt is split across several terms, all its rows are cancelled.",
      ),
    ).toBeVisible()
    expect(remove).not.toHaveBeenCalled()
  })

  it("confirms cancellation of one receipt and preserves the other receipts", async () => {
    const payments = [
      receipt("p1", "2027-03-10T12:00:00Z", [{ termId: "t1", amountCzk: 3000 }]),
      receipt("p2", "2027-03-12T12:00:00Z", [{ termId: "t1", amountCzk: 1000 }]),
    ]
    let data = application([{ ...first, paidCzk: 4000 }], payments)
    respondWith(() => data)
    remove.mockImplementation(() => {
      data = application([{ ...first, paidCzk: 3000 }], [payments[0]!])
      return Promise.resolve()
    })
    setup()
    const user = userEvent.setup()
    await screen.findByRole("list", { name: "Payment history" })
    const row = historyItem(/1,000/)
    await user.click(within(row).getByRole("button", { name: "Cancel record" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/After cancellation, debt:.*1,900/)).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole("button", { name: "Back" }))
    expect(remove).not.toHaveBeenCalled()
    await user.click(within(row).getByRole("button", { name: "Cancel record" }))
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel record" }),
    )
    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith("organizer/applications/a1/payments/p2"),
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(historyItems()).toHaveLength(1)
    expect(historyItem(/3,000/)).toBeInTheDocument()
  })

  it("records a refund of an overpayment of a term, clears it and previews cancelling the refund", async () => {
    const receiptOfTerm = receipt("p1", "2027-03-10T12:00:00Z", [{ termId: "t1", amountCzk: 5400 }])
    const refund = receipt("r1", "2027-03-12T12:00:00Z", [{ termId: "t1", amountCzk: -500 }])
    let data = application([{ ...first, paidCzk: 5400 }], [receiptOfTerm])
    respondWith(() => data)
    post.mockImplementation(() => {
      data = application([{ ...first, paidCzk: 4900 }], [receiptOfTerm, refund])
      return Promise.resolve()
    })
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Record refund" }))
    expect(screen.getByRole("radio", { name: "Refund" })).toBeChecked()
    await user.click(screen.getByRole("button", { name: "Record refund" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(post).toHaveBeenCalledWith("organizer/applications/a1/payments/refunds", {
      json: { requestId: expect.any(String) as unknown, amountCzk: 500, termId: "t1" },
    })
    const row = historyItem(/Refund ·/)
    expect(row).toHaveTextContent(/-.*500/)
    await user.click(within(row).getByRole("button", { name: "Cancel record" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("Cancel this refund record?")
    expect(screen.getByRole("dialog")).toHaveTextContent(
      /After cancellation, overpayment remaining:.*500/,
    )
  })

  it("shows an overpaid term as an overpayment without payment details", async () => {
    respondWith(() =>
      application(
        [{ ...first, paidCzk: 5400 }],
        [receipt("p1", "2027-03-10T12:00:00Z", [{ termId: "t1", amountCzk: 5400 }])],
      ),
    )
    setup()
    expect(await screen.findByText("Overpaid")).toBeInTheDocument()
    const card = screen.getByText("Overpaid").closest<HTMLElement>("[data-slot=card]")!
    expect(within(card).getByText("Overpayment").nextSibling).toHaveTextContent("500")
    expect(screen.queryByText("Variable symbol")).not.toBeInTheDocument()
    // The overpaid term offers the refund, not a payment for the term (#399); a further payment
    // can still be recorded as an overpayment from the actions under the cards.
    expect(screen.getByRole("button", { name: "Record refund" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Record payment for the term" })).toBeNull()
    expect(screen.getByRole("button", { name: "Record payment" })).toBeInTheDocument()
    expect(screen.queryByText(/-CZK/)).not.toBeInTheDocument()
  })

  it("shows a load error and retry without exposing a payment form", async () => {
    get.mockReturnValue({ json: () => Promise.reject(new Error("Forbidden")) })
    setup()
    expect(await screen.findByText("Payment details could not be loaded")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Record payment/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
  })
})

describe("PaymentDetail refund of an overpayment (#399)", () => {
  it("opens the refund dialog on the overpaid term from its card button", async () => {
    respondWith(() =>
      application(
        [{ ...first, paidCzk: 5400 }],
        [receipt("p1", "2027-03-10T12:00:00Z", [{ termId: "t1", amountCzk: 5400 }])],
      ),
    )
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Record refund" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Record refund" })).toBeInTheDocument()
    expect(within(dialog).getByRole("radio", { name: "Refund" })).toBeChecked()
    expect(within(dialog).getByRole("combobox", { name: "Term *" })).toHaveTextContent(/500/)
    expect(within(dialog).getByLabelText("Amount *")).toHaveValue("500")
  })
})

it("renders the return to applications as a round, keyboard-accessible link", async () => {
  respondWith(() => application([first]))
  setup()
  const link = await screen.findByRole("link", { name: "Back to applications" })
  expect(link).toHaveAttribute("href", "/organizer/events/e1/applications")
  expect(link).toHaveAttribute("data-size", "icon-lg")
  expect(link).toHaveClass("rounded-full", "focus-visible:outline-2")
  await userEvent.tab()
  expect(link).toHaveFocus()
})
