import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OrganizerTermChange } from "@/features/event-overview/components/OrganizerTermChange"

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock("@/lib/api-client", async () => ({
  ...(await vi.importActual<object>("@/lib/api-client")),
  api: { get, put },
}))

const options = [
  { id: "t1", name: "First", startsOn: "2027-07-12", endsOn: "2027-07-18", selected: true },
  { id: "t2", name: "Second", startsOn: "2027-07-19", endsOn: "2027-07-25", selected: false },
]
const application = {
  firstName: "Adam",
  lastName: "Dvořák",
  eventName: "Camp",
  terms: [{ termId: "t1", priceCzk: 4900 }],
}
const preview = (isFitting: boolean) => ({
  gender: "MALE",
  newPriceCzk: 5600,
  amountToPayCzk: 5600,
  overpaymentCzk: 4900,
  added: [
    {
      termId: "t2",
      priceCzk: 5600,
      fits: isFitting,
      genderCapacity: 50,
      genderFree: isFitting ? 2 : 0,
    },
  ],
  removed: [{ termId: "t1", paidCzk: 4900, overpaymentCzk: 4900 }],
})

function mockApi(isFitting: boolean) {
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path.endsWith("change-options")
          ? options
          : path.endsWith("change-preview")
            ? preview(isFitting)
            : application,
      ),
  }))
}

function setup() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <OrganizerTermChange applicationId="a1" />
    </QueryClientProvider>,
  )
}

async function pickNewTerm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Change terms" }))
  const dialog = screen.getByRole("dialog")
  await user.click(within(dialog).getByRole("combobox"))
  await user.click(await screen.findByRole("option", { name: /Second/ }))
  return dialog
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("OrganizerTermChange", () => {
  it("shows the impact and saves the swapped selection", async () => {
    mockApi(true)
    put.mockReturnValue({
      json: () =>
        Promise.resolve({ changed: true, changedAt: "2026-11-05T14:30:00Z", changedByName: "Eva" }),
    })
    setup()
    const user = userEvent.setup()

    const dialog = await pickNewTerm(user)
    expect(await within(dialog).findByText(/Free places for men/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Confirm the term change" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(put).toHaveBeenCalledWith("organizer/applications/a1/terms", {
      json: { termIds: ["t2"] },
    })
  })

  it("asks for a conscious confirmation when the new term is full", async () => {
    mockApi(false)
    put.mockReturnValue({
      json: () =>
        Promise.resolve({ changed: true, changedAt: "2026-11-05T14:30:00Z", changedByName: "Eva" }),
    })
    setup()
    const user = userEvent.setup()

    const dialog = await pickNewTerm(user)
    await user.click(await within(dialog).findByRole("button", { name: "Confirm the term change" }))
    expect(put).not.toHaveBeenCalled()
    const confirm = screen.getByRole("button", { name: "Confirm the change" })
    expect(confirm).toBeDisabled()
    await user.click(screen.getByRole("checkbox"))
    await user.click(confirm)

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("organizer/applications/a1/terms", {
        json: { termIds: ["t2"], confirmOverCapacity: true },
      }),
    )
  })
})
