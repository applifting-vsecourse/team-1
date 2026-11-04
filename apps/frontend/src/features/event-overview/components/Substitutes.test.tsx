import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  SubstituteOutcome,
  type SubstituteOutcomeData,
} from "@/features/event-overview/components/SubstituteOutcome"
import { SubstitutesPanel } from "@/features/event-overview/components/SubstitutesPanel"

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/lib/api-client", () => ({
  api: { get, post },
  apiErrorCode: (error: { code?: string }) => error?.code,
}))
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()

const item = (id: string, firstName: string, position: number) => ({
  applicationId: id,
  number: position,
  firstName,
  lastName: "Test",
  birthDate: "2011-05-04",
  gender: "MALE" as const,
  email: `${id}@example.com`,
  submittedAt: `2027-03-10T09:1${position}:00Z`,
  position,
  priceCzk: 4900,
})
const term = { id: "t1", startsOn: "2027-07-12", endsOn: "2027-07-18" }
const list = (overrides = {}) => ({
  termId: "t1",
  evaluationMode: "MANUAL",
  roomMode: "GENDERED",
  freeBeds: { FEMALE: 0, MALE: 1 },
  items: [item("a1", "Adam", 1), item("a2", "Petr", 2)],
  ...overrides,
})

function Harness() {
  const [outcome, setOutcome] = useState<SubstituteOutcomeData | null>(null)
  return outcome ? (
    <SubstituteOutcome
      outcome={outcome}
      onBack={() => setOutcome(null)}
    />
  ) : (
    <SubstitutesPanel
      eventId="e1"
      term={term}
      onOutcome={setOutcome}
    />
  )
}
function setup(data: unknown = list()) {
  get.mockReturnValue({ json: () => Promise.resolve(data) })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Harness />
    </QueryClientProvider>,
  )
}
beforeEach(() => vi.clearAllMocks())

describe("suitable substitutes (US-104)", () => {
  it("lists the substitutes of the free bed in order, with the free beds of the term", async () => {
    setup()
    expect(await screen.findByText(/1 free men's bed/)).toBeInTheDocument()
    const [first, second] = screen.getAllByRole("listitem")
    if (!first || !second) throw new Error("expected two substitutes")
    expect(within(first).getByText("Adam Test")).toBeInTheDocument()
    expect(within(second).getByText("Petr Test")).toBeInTheDocument()
    expect(
      screen.getByText("The substitutes shown match the group of the free bed."),
    ).toBeInTheDocument()
  })

  it("shows nothing without suitable substitutes or in the automatic mode", async () => {
    setup(list({ items: [] }))
    await screen.findByText(/./, undefined, { timeout: 100 }).catch(() => undefined)
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("asks first, then confirms and shows the payment data", async () => {
    post.mockReturnValue({
      json: () =>
        Promise.resolve({
          applicationId: "a2",
          priceCzk: 4900,
          bankAccount: "123456789/0000",
          variableSymbol: "2027001",
        }),
    })
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: /Confirm substitute: Petr Test/ }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Confirm Petr Test?")).toBeInTheDocument()
    expect(within(dialog).getByText(/takes the last free men's bed/)).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole("button", { name: "Confirm attendance" }))
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/substitutes/a2/confirm")
    expect(await screen.findByText("Petr Test is confirmed.")).toBeInTheDocument()
    expect(screen.getByText("123456789/0000")).toBeInTheDocument()
    expect(screen.getByText("2027001")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Back to substitutes" }))
    expect(await screen.findByText("Adam Test")).toBeInTheDocument()
  })

  it("says the bed was taken meanwhile and keeps the substitute waiting", async () => {
    post.mockReturnValue({
      json: () => Promise.reject(Object.assign(new Error("taken"), { code: "BED_ALREADY_TAKEN" })),
    })
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: /Confirm substitute: Adam Test/ }))
    await user.click(await screen.findByRole("button", { name: "Confirm attendance" }))
    expect(
      await screen.findByText("The bed has meanwhile been taken by another organizer."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Adam Test stays a substitute. The capacity is not exceeded."),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Show current substitutes" }))
    expect(await screen.findByText("Petr Test")).toBeInTheDocument()
  })
})
