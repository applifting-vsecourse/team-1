import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"

import { termStatusesQueryOptions } from "@/features/event-overview/api/termStatus"
import { TermStatuses } from "@/features/event-overview/components/TermStatuses"

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, patch } }))

const term = (overrides: object = {}) => ({
  termId: "t1",
  name: "T1",
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  status: "WAITLISTED",
  priceCzk: 6900,
  owedCzk: 1000,
  capacity: 50,
  debtCzk: 0,
  confirmationExceedsCapacity: false,
  confirmationNextOccupied: 49,
  confirmationCapacity: 50,
  confirmationOccupied: 48,
  confirmationDueCzk: 6900,
  occupied: 48,
  waitlistPosition: null,
  allowedStatuses: ["CONFIRMED", "CANCELLED"],
  history: [],
  substituteRecords: [],
  ...overrides,
})

function TermStatusesUnderTest() {
  const query = useQuery(termStatusesQueryOptions("a1"))
  return (
    <TermStatuses
      applicationId="a1"
      query={query}
      application={undefined}
    />
  )
}

function setup() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TermStatusesUnderTest />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("TermStatuses", () => {
  it("shows the server position for each waitlisted term only", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve([
          term({ waitlistPosition: 2 }),
          term({ termId: "t2", name: "T2", waitlistPosition: 5 }),
          ...["CONFIRMED", "CANCELLED", "TO_EVALUATE"].map((status, index) =>
            term({
              termId: `other${index}`,
              name: status,
              status,
              waitlistPosition: 9,
              allowedStatuses: [],
            }),
          ),
          term({ termId: "missing", name: "Missing position" }),
        ]),
    })
    setup()
    expect(await screen.findByText("#2 on the waitlist")).toBeVisible()
    expect(screen.getByText("#5 on the waitlist")).toBeVisible()
    expect(screen.queryByText("#9 on the waitlist")).not.toBeInTheDocument()
    expect(screen.getAllByText(/on the waitlist$/)).toHaveLength(2)
  })

  it("localizes the waitlist position in Czech", async () => {
    await i18n.changeLanguage("cs")
    try {
      get.mockReturnValue({ json: () => Promise.resolve([term({ waitlistPosition: 2 })]) })
      setup()
      expect(await screen.findByText("2. v pořadníku")).toBeVisible()
    } finally {
      await i18n.changeLanguage("en")
    }
  })

  it("shows that an organizer created the application", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve([
          term({
            history: [
              {
                id: "c0",
                kind: "CREATED_BY_ORGANIZER",
                fromStatus: "WAITLISTED",
                toStatus: "WAITLISTED",
                changedByName: "Eva",
                changedAt: "2027-03-10T12:00:00Z",
              },
            ],
          }),
        ]),
    })
    setup()

    expect(await screen.findByText(/Added by organiser · Eva/)).toBeInTheDocument()
  })

  it("offers only the changes the server allows and shows the log", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve([
          term({
            status: "CANCELLED",
            allowedStatuses: [],
            history: [
              {
                id: "c1",
                kind: "STATUS_CHANGED",
                fromStatus: "CONFIRMED",
                toStatus: "CANCELLED",
                changedByName: "Eva",
                changedAt: "2027-03-10T12:00:00Z",
              },
            ],
          }),
        ]),
    })
    setup()

    expect(await screen.findByText(/Eva: Confirmed → Cancelled/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Change status" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancel in term" })).not.toBeInTheDocument()
  })

  it("shows Change status as a readable outlined button (#754)", async () => {
    get.mockReturnValue({ json: () => Promise.resolve([term()]) })
    setup()
    expect(await screen.findByRole("button", { name: "Change status" })).toHaveAttribute(
      "data-variant",
      "outline",
    )
  })

  it("confirms a waitlisted application after the dialog", async () => {
    get.mockReturnValue({ json: () => Promise.resolve([term()]) })
    patch.mockResolvedValue(undefined)
    setup()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Change status" }))
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Save status" }),
    )

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(patch).toHaveBeenCalledWith("organizer/applications/a1/terms/t1/status", {
      json: { status: "CONFIRMED" },
    })
  })

  it("warns when the capacity would be exceeded and confirms knowingly on the second click", async () => {
    get.mockReturnValue({ json: () => Promise.resolve([term()]) })
    patch.mockRejectedValueOnce(Object.assign(new Error("full"), { code: "CAPACITY_EXCEEDED" }))
    patch.mockResolvedValueOnce(undefined)
    setup()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Change status" }))
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Save status" }),
    )

    expect(await screen.findByText("Confirmation will exceed capacity.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save status" })).toBeDisabled()
    await user.click(
      screen.getByRole("checkbox", { name: "I knowingly confirm the application over capacity." }),
    )
    await user.click(screen.getByRole("button", { name: "Save status" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(patch).toHaveBeenLastCalledWith("organizer/applications/a1/terms/t1/status", {
      json: { status: "CONFIRMED", confirmOverCapacity: true },
    })
  })

  it("withdraws only active terms from an application with archived history", async () => {
    const user = userEvent.setup()
    get.mockImplementation((path: string) => ({
      json: () =>
        path.endsWith("/terms")
          ? Promise.resolve([
              term({ termId: "archived", status: "ARCHIVED", allowedStatuses: [] }),
              term({ status: "CONFIRMED", allowedStatuses: ["CANCELLED"] }),
              term({ termId: "t2" }),
            ])
          : path.endsWith("withdraw-preview")
            ? Promise.resolve({ terms: [], overpaymentCzk: 0 })
            : path.endsWith("change-options")
              ? Promise.resolve([
                  {
                    id: "candidate",
                    name: null,
                    startsOn: "2027-07-19",
                    endsOn: "2027-07-25",
                    selected: false,
                  },
                ])
              : new Promise<never>(() => undefined),
    }))
    setup()
    expect(await screen.findByRole("heading", { name: "T1 · Archived" })).toBeVisible()
    expect(await screen.findAllByRole("button", { name: "Change term" })).toHaveLength(2)
    expect(screen.getAllByRole("button", { name: "Withdraw" })).toHaveLength(1)
    await user.click(screen.getByRole("button", { name: "Withdraw the whole application" }))
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("organizer/applications/a1/terms/withdraw-preview", {
        searchParams: { termIds: "t1,t2" },
      }),
    )
  })

  it("keeps withdrawal for confirmed terms and status cancellation for waitlisted terms", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve([
          term({ status: "CONFIRMED", allowedStatuses: ["WAITLISTED", "CANCELLED"] }),
          term({ termId: "t2", status: "WAITLISTED", allowedStatuses: ["CONFIRMED", "CANCELLED"] }),
        ]),
    })
    setup()

    await screen.findByRole("button", { name: "Withdraw" })
    expect(screen.getByRole("button", { name: "Withdraw the whole application" })).toBeVisible()
    // Waitlisted terms use cancellation; confirmed terms keep the withdrawal impact flow.
    expect(screen.getAllByRole("button", { name: "Withdraw" })).toHaveLength(1)
    expect(screen.queryByRole("button", { name: "Cancel in term" })).not.toBeInTheDocument()
  })
})

describe("designed status states", () => {
  it("shows the empty state", async () => {
    get.mockReturnValue({ json: () => Promise.resolve([]) })
    setup()
    expect(await screen.findByText("No terms selected")).toBeVisible()
    expect(screen.getByText("No term has been selected yet.")).toBeVisible()
  })
  it.each([0, -500])("does not offer waitlisting a paid confirmed term (%s)", async (owedCzk) => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve([
          term({ status: "CONFIRMED", owedCzk, allowedStatuses: ["WAITLISTED", "CANCELLED"] }),
        ]),
    })
    setup()
    expect(await screen.findByText("T1 · Confirmed and paid")).toBeVisible()
    expect(screen.queryByRole("button", { name: "Change status" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeVisible()
  })
  it.each([
    { name: "free term", priceCzk: 0, owedCzk: 0 },
    { name: "retained payment covering the price", priceCzk: 6900, owedCzk: -6900 },
  ])("labels confirmation as paid for $name", async ({ priceCzk, owedCzk }) => {
    get.mockReturnValue({
      json: () => Promise.resolve([term({ priceCzk, owedCzk, confirmationDueCzk: 0 })]),
    })
    patch.mockResolvedValue(undefined)
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Change status" }))
    expect(screen.getByRole("combobox")).toHaveTextContent("Confirmed and paid")
    await user.click(screen.getByRole("button", { name: "Save status" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(patch).toHaveBeenCalledWith("organizer/applications/a1/terms/t1/status", {
      json: { status: "CONFIRMED" },
    })
  })
  it("cancels a waitlisted term through the status endpoint", async () => {
    get.mockReturnValue({ json: () => Promise.resolve([term({ allowedStatuses: ["CANCELLED"] })]) })
    patch.mockResolvedValue(undefined)
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Change status" }))
    await user.click(screen.getByRole("button", { name: "Cancel participation in term" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(patch).toHaveBeenCalledWith("organizer/applications/a1/terms/t1/status", {
      json: { status: "CANCELLED" },
    })
  })
  it("uses the server's capacity decision before the first save", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve([
          term({
            confirmationExceedsCapacity: true,
            confirmationOccupied: 50,
            confirmationNextOccupied: 51,
          }),
        ]),
    })
    patch.mockResolvedValue(undefined)
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Change status" }))
    expect(screen.getByRole("button", { name: "Save status" })).toBeDisabled()
    expect(patch).not.toHaveBeenCalled()
    expect(screen.getByText(/After confirmation it will be 51\/50/)).toBeVisible()
    await user.click(
      screen.getByRole("checkbox", { name: "I knowingly confirm the application over capacity." }),
    )
    await user.click(screen.getByRole("button", { name: "Save status" }))
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("organizer/applications/a1/terms/t1/status", {
        json: { status: "CONFIRMED", confirmOverCapacity: true },
      }),
    )
  })
  it("keeps the selected state after an error and allows retry", async () => {
    get.mockReturnValue({ json: () => Promise.resolve([term()]) })
    patch.mockRejectedValueOnce(new Error("private server detail"))
    patch.mockResolvedValueOnce(undefined)
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Change status" }))
    await user.click(screen.getByRole("button", { name: "Save status" }))
    expect(await screen.findByText("The change was not saved")).toBeVisible()
    expect(screen.queryByText("private server detail")).not.toBeInTheDocument()
    expect(screen.getByRole("combobox")).toHaveTextContent("Confirmed with balance due")
    await user.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })
  it("disables the selection and shows saving while submitting", async () => {
    get.mockReturnValue({ json: () => Promise.resolve([term()]) })
    let resolve!: () => void
    patch.mockReturnValue(
      new Promise<void>((done) => {
        resolve = done
      }),
    )
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Change status" }))
    await user.click(screen.getByRole("button", { name: "Save status" }))
    expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled()
    expect(screen.getByRole("combobox")).toBeDisabled()
    resolve()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })
})
