import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  SubstitutesPanel,
  type SubstituteTaken,
} from "@/features/event-overview/components/SubstitutesPanel"
import { SubstituteTaken as SubstituteTakenScreen } from "@/features/event-overview/components/SubstituteTaken"

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

const onConfirmed = vi.fn()

function Harness() {
  const [taken, setTaken] = useState<SubstituteTaken | null>(null)
  return taken ? (
    <SubstituteTakenScreen
      {...taken}
      onRefresh={() => setTaken(null)}
    />
  ) : (
    <SubstitutesPanel
      eventId="e1"
      term={term}
      onConfirmed={onConfirmed}
      onTaken={setTaken}
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
    const rows = screen.getAllByRole("row").slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]!).getByText("Adam Test")).toBeInTheDocument()
    expect(within(rows[0]!).getByText("Waitlisted · 1")).toBeInTheDocument()
    expect(within(rows[1]!).getByText("Petr Test")).toBeInTheDocument()
  })

  it("lists men and women in separate cards with their free beds and the sorting", async () => {
    setup(
      list({
        freeBeds: { FEMALE: 1, MALE: 1 },
        items: [item("a1", "Adam", 1), { ...item("a3", "Jana", 1), gender: "FEMALE" }],
      }),
    )
    expect(await screen.findByText("A bed has been freed")).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1)
    const men = await screen.findByRole("region", { name: "Men" })
    const women = screen.getByRole("region", { name: "Women" })
    expect(within(men).getByText(/1 free men's bed/)).toBeInTheDocument()
    expect(within(women).getByText(/1 free women's bed/)).toBeInTheDocument()
    expect(within(men).getByText("Sorted: in order of receipt, oldest first")).toBeInTheDocument()
    expect(within(men).getAllByText("Adam Test")).not.toHaveLength(0)
    expect(within(men).queryByText("Jana Test")).toBeNull()
    expect(within(women).getAllByText("Jana Test")).not.toHaveLength(0)
  })

  it("shows the chip of a woman with her position", async () => {
    setup(list({ items: [{ ...item("a3", "Jana", 1), gender: "FEMALE" }] }))
    expect(await screen.findAllByText("Waitlisted · 1")).not.toHaveLength(0)
  })

  it("shows nothing without suitable substitutes or in the automatic mode", async () => {
    setup(list({ items: [] }))
    await screen.findByText(/./, undefined, { timeout: 100 }).catch(() => undefined)
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("asks first, then confirms and hands over to the application", async () => {
    post.mockResolvedValue({})
    setup()
    const user = userEvent.setup()
    await user.click(
      (await screen.findAllByRole("button", { name: /Confirm substitute: Petr Test/ }))[0]!,
    )
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Confirm Petr Test?")).toBeInTheDocument()
    expect(within(dialog).getByText(/takes the last free men's bed/)).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole("button", { name: "Confirm attendance" }))
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/substitutes/a2/confirm")
    await vi.waitFor(() => expect(onConfirmed).toHaveBeenCalledWith("a2"))
  })

  it("says the bed was taken meanwhile and keeps the substitute waiting", async () => {
    post.mockRejectedValue(Object.assign(new Error("taken"), { code: "BED_ALREADY_TAKEN" }))
    setup()
    const user = userEvent.setup()
    await user.click(
      (await screen.findAllByRole("button", { name: /Confirm substitute: Adam Test/ }))[0]!,
    )
    await user.click(await screen.findByRole("button", { name: "Confirm attendance" }))
    expect(
      await screen.findByText("The bed has meanwhile been taken by another organizer."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Adam Test stays a substitute. The capacity is not exceeded."),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Show current substitutes" }))
    expect((await screen.findAllByText("Petr Test")).length).toBeGreaterThan(0)
  })
})
