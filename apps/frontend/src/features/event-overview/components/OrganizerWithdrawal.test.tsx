import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { type TermStatusDetail } from "@/features/event-overview/api/termStatus"
import { OrganizerWithdrawal } from "@/features/event-overview/components/OrganizerWithdrawal"

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/lib/api-client", async () => ({
  ...(await vi.importActual<object>("@/lib/api-client")),
  api: { get, post },
}))

const term = (id: string, name: string, startsOn: string, endsOn: string) =>
  ({
    termId: id,
    name,
    startsOn,
    endsOn,
    status: "CONFIRMED",
    priceCzk: 4900,
    allowedStatuses: [],
    history: [],
    substituteRecords: [],
    waitlistPosition: null,
  }) as TermStatusDetail
const terms = [
  term("t1", "First", "2027-07-12", "2027-07-18"),
  term("t2", "Second", "2027-07-19", "2027-07-25"),
]
const application = { firstName: "Adam", lastName: "Dvořák", eventName: "Camp", terms: [] }
const row = (termId: string, isWithdrawn: boolean, paidCzk: number, overpaymentCzk: number) => ({
  termId,
  status: "CONFIRMED",
  isWithdrawn,
  hasFinancialImpact: true,
  paidCzk,
  debtCzk: 0,
  overpaymentCzk,
  substitute: null,
})

function mockApi(
  substitute: { applicationId: string; firstName: string; lastName: string } | null = null,
) {
  get.mockImplementation((path: string, options?: { searchParams?: { termIds: string } }) => ({
    json: () => {
      if (!path.endsWith("withdraw-preview")) return Promise.resolve(application)
      const ids = options?.searchParams?.termIds.split(",") ?? []
      return Promise.resolve({
        terms: [
          {
            ...row("t1", ids.includes("t1"), 4900, ids.includes("t1") ? 4900 : 0),
            substitute: ids.includes("t1") ? substitute : null,
          },
          row("t2", ids.includes("t2"), 0, 0),
        ],
        overpaymentCzk: 4900,
      })
    },
  }))
  post.mockReturnValue({
    json: () => Promise.resolve({ changedAt: "2026-11-05T14:30:00Z", changedByName: "Jakub" }),
  })
}

function setup(initialTermId: string | null, onClose = vi.fn()) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <OrganizerWithdrawal
        applicationId="a1"
        terms={terms}
        initialTermId={initialTermId}
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return onClose
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi()
})

describe("OrganizerWithdrawal", () => {
  it("shows the impact of withdrawing from one term and confirms it", async () => {
    const onClose = setup("t1")
    const user = userEvent.setup()

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Withdraw participant" })).toBeVisible()
    expect(await within(dialog).findByText("Debt after withdrawal")).toBeVisible()
    expect(within(dialog).getByText("Overpayment")).toBeVisible()
    // Only the impact and the refund warning: no reassurances, no e-mail or history notes.
    expect(within(dialog).getByText("The payment is not refunded automatically")).toBeVisible()
    expect(within(dialog).getByText("Record the refund manually.")).toBeVisible()
    expect(within(dialog).queryByText(/other term/i)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/e-mail/i)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/history/i)).not.toBeInTheDocument()
    expect(get).toHaveBeenCalledWith(
      "organizer/applications/a1/terms/withdraw-preview",
      expect.objectContaining({ searchParams: { termIds: "t1" } }),
    )
    expect(post).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("button", { name: "Withdraw participant" }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith("organizer/applications/a1/terms/withdraw", {
      json: { termIds: ["t1"], expectedSubstitutes: [{ termId: "t1", applicationId: null }] },
    })
  })

  it("explains that withdrawing a waitlisted term releases no bed and has no financial impact", async () => {
    get.mockImplementation((path: string) => ({
      json: () =>
        Promise.resolve(
          path.endsWith("withdraw-preview")
            ? {
                terms: [
                  { ...row("t2", true, 0, 0), status: "WAITLISTED", hasFinancialImpact: false },
                ],
                overpaymentCzk: 0,
              }
            : application,
        ),
    }))
    setup("t2")
    expect(
      await screen.findByText("No bed is assigned. The financial impact is zero."),
    ).toBeVisible()
    expect(screen.queryByText("The payment is not refunded automatically")).toBeNull()
    expect(screen.getByRole("button", { name: "Withdraw waitlisted participant" })).toBeEnabled()
  })
  it("withdraws from the whole application with the impact per term", async () => {
    const onClose = setup(null)
    const user = userEvent.setup()

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: "Withdraw the whole application" }),
    ).toBeVisible()
    expect(
      await within(dialog).findByRole("heading", { name: "Financial impact per term" }),
    ).toBeVisible()
    expect(within(dialog).getByText(/^First/)).toBeVisible()
    expect(within(dialog).getByText(/^Second/)).toBeVisible()

    await user.click(within(dialog).getByRole("button", { name: "Withdraw from both terms" }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(post).toHaveBeenCalledWith("organizer/applications/a1/terms/withdraw", {
      json: {
        termIds: ["t1", "t2"],
        expectedSubstitutes: [
          { termId: "t1", applicationId: null },
          { termId: "t2", applicationId: null },
        ],
      },
    })
  })

  it("does not offer the confirmation before the impact is loaded", async () => {
    get.mockImplementation(() => ({ json: () => new Promise(() => undefined) }))
    setup("t1")

    expect(await screen.findByRole("button", { name: "Withdraw participant" })).toBeDisabled()
  })
})

describe("OrganizerWithdrawal substitute warning (US-546)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("names the substitute who fills the bed automatically", async () => {
    mockApi({ applicationId: "a2", firstName: "Petr", lastName: "Novák" })
    setup("t1")

    expect(await screen.findByText("A substitute fills the bed automatically")).toBeInTheDocument()
    expect(screen.getByText(/Petr Novák/)).toBeInTheDocument()
  })

  it("shows no warning when nobody takes the bed", async () => {
    mockApi(null)
    setup("t1")

    await screen.findByText("Impact of the withdrawal")
    expect(screen.queryByText("A substitute fills the bed automatically")).not.toBeInTheDocument()
  })

  it("sends the previewed substitute and reloads the preview when the server refuses it", async () => {
    mockApi({ applicationId: "a2", firstName: "Petr", lastName: "Novák" })
    post.mockReturnValue({ json: () => Promise.reject(new Error("changed")) })
    const user = userEvent.setup()
    setup("t1")

    const button = await screen.findByRole("button", { name: "Withdraw participant" })
    await screen.findByText(/Petr Novák/)
    const previews = () =>
      get.mock.calls.filter(([path]) => String(path).endsWith("withdraw-preview")).length
    const before = previews()
    await user.click(button)

    await waitFor(() => expect(previews()).toBeGreaterThan(before))
    expect(post).toHaveBeenCalledWith("organizer/applications/a1/terms/withdraw", {
      json: { termIds: ["t1"], expectedSubstitutes: [{ termId: "t1", applicationId: "a2" }] },
    })
  })
})
