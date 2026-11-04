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

const { get, toDataURL } = vi.hoisted(() => ({ get: vi.fn(), toDataURL: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))
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

const renderDetail = (data: MyApplication) => {
  get.mockReturnValue({ json: () => Promise.resolve(data) })
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
  it("copies the account and the summary variable symbol", async () => {
    const user = userEvent.setup()
    const write = vi.spyOn(navigator.clipboard, "writeText")
    renderDetail(application())
    await user.click(await screen.findByRole("button", { name: "Copy account number" }))
    expect(write).toHaveBeenLastCalledWith("2900123456/2010")
    await user.click(screen.getByRole("button", { name: "Copy variable symbol" }))
    expect(write).toHaveBeenLastCalledWith("48000")
  })

  beforeEach(() => {
    get.mockReset()
    toDataURL.mockReset()
    toDataURL.mockResolvedValue("data:image/png;base64,AAAA")
  })

  it("shows what is due, what is paid, what is left and where to send it", async () => {
    renderDetail(application())

    expect(
      await screen.findByRole("heading", { level: 1, name: "Letní kemp 2027" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Left to pay")).toBeInTheDocument()
    expect(screen.getByText("Partly paid")).toBeInTheDocument()
    expect(screen.getByText("2900123456/2010")).toBeInTheDocument()
    expect(screen.getByText("48000")).toBeInTheDocument()
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

  it("offers the transfer details only while something is left to pay", async () => {
    renderDetail(application())
    expect(await screen.findByRole("heading", { name: "Payment details" })).toBeInTheDocument()
  })

  it("shows an overpayment as an overpayment, not as zero", async () => {
    const base = application()
    renderDetail(
      application({
        amountPaidCzk: 5100,
        amountOwedCzk: -600,
        paymentStatus: "OVERPAID",
        paymentDetails: {
          ...base.paymentDetails!,
          summary: { variableSymbol: "48000", payableCzk: 0 },
        },
      }),
    )

    expect(await screen.findByText("Overpayment")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Payment information" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Payment details" })).not.toBeInTheDocument()
    expect(screen.queryByText("Left to pay")).not.toBeInTheDocument()
    expect(screen.queryByText("To pay")).not.toBeInTheDocument()
  })

  it("still shows what to pay when an overpaid term makes the whole balance negative", async () => {
    const base = application()
    renderDetail(
      application({
        amountPaidCzk: 5100,
        amountOwedCzk: -600,
        paymentStatus: "OVERPAID",
        paymentDetails: {
          ...base.paymentDetails!,
          summary: { variableSymbol: "48000", payableCzk: 1500 },
        },
      }),
    )

    expect(await screen.findByRole("heading", { name: "Payment details" })).toBeInTheDocument()
    expect(screen.getByText("To pay")).toBeInTheDocument()
  })

  it("shows a waitlisted term as waitlisted without a place in line, not to be paid yet", async () => {
    renderDetail(application({ terms: [confirmed, waitlisted] }))

    expect(await screen.findByText("Waitlisted")).toBeInTheDocument()
    expect(screen.getByText("0 CZK until confirmed")).toBeInTheDocument()
    expect(screen.queryByText(/in line|position/i)).not.toBeInTheDocument()
    expect(screen.getByText(/you are waitlisted and have no amount due yet/)).toBeInTheDocument()
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
    expect(screen.queryByText("0 CZK until confirmed")).not.toBeInTheDocument()
    expect(screen.queryByText("Account number")).not.toBeInTheDocument()
  })

  it("shows no payment block when every term is waitlisted", async () => {
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

    expect(await screen.findByText("Waitlisted")).toBeInTheDocument()
    expect(screen.queryByText("Payment for the confirmed term")).not.toBeInTheDocument()
    expect(screen.queryByText("Account number")).not.toBeInTheDocument()
  })

  it("shows only the summary symbol while one term is confirmed (U04q)", async () => {
    renderDetail(application({ terms: [confirmed, waitlisted] }))

    expect(await screen.findByText("48000")).toBeInTheDocument()
    expect(screen.queryByText("48001")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Whole application" })).not.toBeInTheDocument()
  })

  it("shows the whole application and every confirmed term with its own symbol (U04p)", async () => {
    const second = { ...waitlisted, status: "CONFIRMED" as const }
    renderDetail(
      application({
        terms: [confirmed, second],
        amountDueCzk: 9400,
        amountPaidCzk: 4500,
        amountOwedCzk: 4900,
        paymentDetails: {
          bankAccount: "2900123456/2010",
          summary: { variableSymbol: "48000", payableCzk: 4900 },
          terms: [
            {
              termId: "t1",
              termNumber: 1,
              variableSymbol: "48001",
              dueCzk: 4500,
              paidCzk: 4500,
              owedCzk: 0,
              paymentStatus: "PAID",
            },
            {
              termId: "t2",
              termNumber: 2,
              variableSymbol: "48002",
              dueCzk: 4900,
              paidCzk: 0,
              owedCzk: 4900,
              paymentStatus: "UNPAID",
            },
          ],
        },
      }),
    )

    expect(await screen.findByRole("heading", { name: "Whole application" })).toBeVisible()
    expect(screen.getByRole("heading", { name: /^1\. týden · / })).toBeVisible()
    expect(screen.getByRole("heading", { name: /^2\. týden · / })).toBeVisible()
    expect(screen.getByText("48000")).toBeInTheDocument()
    expect(screen.getByText("48001")).toBeInTheDocument()
    expect(screen.getByText("48002")).toBeInTheDocument()
    expect(screen.getByText(/or only of the term you are paying/)).toBeVisible()
    // The paid term asks for nothing, the unpaid one for its debt.
    const rows = screen.getAllByText("To pay").map((label) => label.nextElementSibling)
    expect(rows.map((row) => row?.textContent?.replace(/\s/g, " "))).toEqual([
      expect.stringMatching(/4.900/),
      expect.stringMatching(/ 0$/),
      expect.stringMatching(/4.900/),
    ])
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
