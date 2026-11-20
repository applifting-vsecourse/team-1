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
const preview = (isFitting: boolean, paidCzk = 0) => ({
  gender: "MALE",
  newPriceCzk: 5600,
  amountToPayCzk: 5600,
  overpaymentCzk: 4900,
  added: [
    {
      termId: "t2",
      priceCzk: 5600,
      paidCzk,
      toPayCzk: Math.max(0, 5600 - paidCzk),
      fits: isFitting,
      genderCapacity: 50,
      genderFree: isFitting ? 2 : 0,
    },
  ],
  removed: [{ termId: "t1", paidCzk: 4900, overpaymentCzk: 4900 }],
})

function mockApi(isFitting: boolean, paidCzk = 0) {
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path.endsWith("change-options")
          ? options
          : path.endsWith("change-preview")
            ? preview(isFitting, paidCzk)
            : application,
      ),
  }))
}

function setup(isEmpty = false) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <OrganizerTermChange
        applicationId="a1"
        term={
          isEmpty
            ? null
            : ({
                termId: "t1",
                name: "First",
                startsOn: "2027-07-12",
                endsOn: "2027-07-18",
              } as never)
        }
      />
    </QueryClientProvider>,
  )
}

async function pickNewTerm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Change term" }))
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
    expect(await within(dialog).findByText(/Capacity for men/)).toBeInTheDocument()
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

  it("counts the payments kept in a term the application returns to", async () => {
    mockApi(true, 5600)
    setup()
    const user = userEvent.setup()

    const dialog = await pickNewTerm(user)
    const figure = async (label: string) =>
      (await within(dialog).findAllByText(label)).at(-1)!.parentElement!
    expect(await figure("Paid")).toHaveTextContent(/5,600/)
    expect(await figure("To pay")).toHaveTextContent(/CZK 0$/)
  })
})

it("adds a term from the empty status block using the existing preview and change flow", async () => {
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path.endsWith("change-options")
          ? options.map((option) => ({ ...option, selected: false }))
          : path.endsWith("change-preview")
            ? { ...preview(true), removed: [] }
            : application,
      ),
  }))
  put.mockReturnValue({
    json: () =>
      Promise.resolve({ changed: true, changedAt: "2026-11-05T14:30:00Z", changedByName: "Eva" }),
  })
  setup(true)
  const user = userEvent.setup()
  await user.click(await screen.findByRole("button", { name: "Change terms" }))
  await user.click(screen.getByRole("combobox"))
  await user.click(await screen.findByRole("option", { name: /Second/ }))
  expect(await screen.findByText(/Capacity for men/)).toBeVisible()
  await user.click(screen.getByRole("button", { name: "Confirm the term change" }))
  await waitFor(() =>
    expect(put).toHaveBeenCalledWith("organizer/applications/a1/terms", {
      json: { termIds: ["t2"] },
    }),
  )
})
