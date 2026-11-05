import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ManualApplicationPage } from "@/features/event-overview/components/ManualApplicationPage"

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
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
  get.mockReturnValue({
    json: () =>
      Promise.resolve({
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
  })
  post.mockReturnValue({
    json: () => Promise.resolve({ applicationId: "a1", number: 1 }),
  })
})

describe("ManualApplicationPage", () => {
  it("requires consent and creates a waitlisted application with the entered phone", async () => {
    setup()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText("First name *"), "Eva")
    await user.type(screen.getByLabelText("Last name *"), "Novak")
    fireEvent.change(screen.getByLabelText("Date of birth *"), {
      target: { value: "15/05/2000" },
    })
    await user.click(screen.getByRole("combobox", { name: "Gender for room assignment *" }))
    await user.click(screen.getByRole("option", { name: "Female" }))
    await user.type(screen.getByLabelText("Phone *"), "+420 777 123 456")
    await user.type(screen.getByLabelText("E-mail *"), "eva@example.com")
    await user.click(screen.getByRole("combobox", { name: /First/ }))
    await user.click(screen.getByRole("option", { name: "Waitlisted" }))

    await user.click(screen.getByRole("button", { name: "Create application" }))
    expect(screen.getByText("Confirm the applicant's consent.")).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole("checkbox", { name: /I confirm that the applicant consented/ }),
    )
    await user.click(screen.getByRole("button", { name: "Create application" }))

    expect(await screen.findByText("Application created")).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith("organizer/events/e1/applications", {
      json: {
        firstName: "Eva",
        lastName: "Novak",
        birthDate: "2000-05-15",
        gender: "FEMALE",
        phone: "+420 777 123 456",
        email: "eva@example.com",
        consent: true,
        terms: [{ termId: "t1", status: "WAITLISTED" }],
      },
    })
  })
})
