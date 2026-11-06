import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ManualApplicationPage } from "@/features/event-overview/components/ManualApplicationPage"

const { get, post, loadSavedTerms } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  loadSavedTerms: vi.fn(),
}))
vi.mock("@/lib/api-client", () => ({ api: { get, post } }))

Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()
globalThis.ResizeObserver = class {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

const term = {
  id: "t1",
  name: "First",
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  priceCzk: 4900,
}
const savedTerm = {
  termId: term.id,
  name: term.name,
  startsOn: term.startsOn,
  endsOn: term.endsOn,
  status: "WAITLISTED",
  priceCzk: term.priceCzk,
  allowedStatuses: [],
  history: [],
  substituteRecords: [],
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  status = "Waitlisted",
  phone = "+420 777 123 456",
) {
  await user.type(await screen.findByLabelText("First name *"), "Eva")
  await user.type(screen.getByLabelText("Last name *"), "Novak")
  fireEvent.change(screen.getByLabelText("Date of birth *"), {
    target: { value: "15/05/2000" },
  })
  await user.click(screen.getByRole("combobox", { name: "Gender for room assignment *" }))
  await user.click(screen.getByRole("option", { name: "Female" }))
  await user.type(screen.getByLabelText("Phone *"), phone)
  await user.type(screen.getByLabelText("E-mail *"), "eva@example.com")
  await user.click(screen.getByRole("combobox", { name: /First/ }))
  await user.click(screen.getByRole("option", { name: status }))
}

function setup() {
  const root = createRootRoute({
    component: () => (
      <ManualApplicationPage
        eventId="e1"
        eventName="Camp"
        terms={[term]}
        organizerName="Organizer"
      />
    ),
  })
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

beforeEach(() => {
  vi.clearAllMocks()
  loadSavedTerms.mockResolvedValue([savedTerm])
  get.mockImplementation((path: string) => ({
    json: () =>
      path === "organizer/applications/a1/terms"
        ? loadSavedTerms()
        : Promise.resolve({
            eventId: "e1",
            terms: [
              {
                ...term,
                roomMode: "SHARED",
                roomCount: 1,
                capacity: 1,
                confirmed: 1,
                free: 0,
                waitlisted: 0,
                byGender: null,
              },
            ],
          }),
  }))
  post.mockReturnValue({
    json: () => Promise.resolve({ applicationId: "a1", number: 1 }),
  })
})

describe("ManualApplicationPage", () => {
  it.each(["       ", "-------", "123 456"])(
    "validates consent and phone digits before creating a waitlisted application: %j",
    async (invalidPhone) => {
      setup()
      const user = userEvent.setup()
      await fillForm(user, "Waitlisted", invalidPhone)

      await user.click(screen.getByRole("button", { name: "Create application" }))
      expect(screen.getByText("Confirm the applicant's consent.")).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()

      await user.click(
        screen.getByRole("checkbox", { name: /I confirm that the applicant consented/ }),
      )
      await user.click(screen.getByRole("button", { name: "Create application" }))
      expect(post).not.toHaveBeenCalled()
      expect(
        screen.getByLabelText("Phone *").parentElement?.querySelector('[role="alert"]'),
      ).not.toBeNull()

      await user.clear(screen.getByLabelText("Phone *"))
      await user.type(screen.getByLabelText("Phone *"), " +420 (777) 123-456 ")
      await user.click(screen.getByRole("button", { name: "Create application" }))

      expect(await screen.findByText("Application created")).toBeInTheDocument()
      expect(post).toHaveBeenCalledWith("organizer/events/e1/applications", {
        json: {
          firstName: "Eva",
          lastName: "Novak",
          birthDate: "2000-05-15",
          gender: "FEMALE",
          phone: "+420777123456",
          email: "eva@example.com",
          consent: true,
          terms: [{ termId: "t1", status: "WAITLISTED" }],
        },
      })
    },
  )

  it("disables returning to waitlist during a slow save and shows the stored confirmation and price", async () => {
    let complete!: (saved: { applicationId: string; number: number }) => void
    const pending = new Promise<{ applicationId: string; number: number }>((resolve) => {
      complete = resolve
    })
    post.mockReturnValue({ json: () => pending })
    loadSavedTerms.mockResolvedValue([{ ...savedTerm, status: "CONFIRMED", priceCzk: 5100 }])
    setup()
    const user = userEvent.setup()
    await fillForm(user, "Confirmed, payment due")
    await user.click(
      screen.getByRole("checkbox", { name: /I confirm that the applicant consented/ }),
    )
    await user.click(screen.getByRole("button", { name: "Create application" }))
    expect(screen.getByRole("heading", { name: "Confirm over capacity" })).toBeInTheDocument()
    await user.click(screen.getByRole("checkbox", { name: "I confirm exceeding capacity" }))
    await user.click(screen.getByRole("button", { name: "Create application" }))

    const returnButton = screen.getByRole("button", { name: "Choose waitlisted" })
    expect(returnButton).toBeDisabled()
    await user.click(returnButton)
    expect(screen.getByRole("heading", { name: "Confirm over capacity" })).toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith("organizer/events/e1/applications", {
      json: expect.objectContaining({
        terms: [{ termId: "t1", status: "CONFIRMED" }],
        confirmOverCapacity: true,
      }),
    })

    await act(async () => complete({ applicationId: "a1", number: 1 }))
    expect(await screen.findByText("Application created")).toBeInTheDocument()
    expect(screen.getByText(/Confirmed, payment due/)).toBeInTheDocument()
    expect(screen.getByText(/5[,\s]100/)).toBeInTheDocument()
    expect(screen.queryByText(/Nothing to pay/)).not.toBeInTheDocument()
  })

  it("shows the submitted participant and saved status after the draft changes during saving", async () => {
    let complete!: (saved: { applicationId: string; number: number }) => void
    const pending = new Promise<{ applicationId: string; number: number }>((resolve) => {
      complete = resolve
    })
    post.mockReturnValue({ json: () => pending })
    setup()
    const user = userEvent.setup()
    await fillForm(user)
    await user.click(
      screen.getByRole("checkbox", { name: /I confirm that the applicant consented/ }),
    )
    await user.click(screen.getByRole("button", { name: "Create application" }))
    await user.clear(screen.getByLabelText("First name *"))
    await user.type(screen.getByLabelText("First name *"), "Other")
    await user.click(screen.getByRole("combobox", { name: /First/ }))
    await user.click(screen.getByRole("option", { name: "Confirmed, payment due" }))

    await act(async () => complete({ applicationId: "a1", number: 1 }))
    expect(await screen.findByText("Application created")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Eva Novak" })).toBeInTheDocument()
    expect(screen.getByText(/Waitlisted/)).toBeInTheDocument()
    expect(screen.getByText(/Nothing to pay/)).toBeInTheDocument()
    expect(screen.queryByText(/Confirmed, payment due/)).not.toBeInTheDocument()
  })

  it("retries loading the saved statuses without creating another application", async () => {
    loadSavedTerms.mockRejectedValueOnce(new Error("network unavailable"))
    setup()
    const user = userEvent.setup()
    await fillForm(user)
    await user.click(
      screen.getByRole("checkbox", { name: /I confirm that the applicant consented/ }),
    )
    await user.click(screen.getByRole("button", { name: "Create application" }))
    expect(await screen.findByText("The statuses could not be loaded")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /retry|try again/i }))
    expect(await screen.findByText("Application created")).toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(1)
  })
})
