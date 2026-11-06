import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EditApplicationPage } from "@/features/participant/components/EditApplicationPage"

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, put } }))

const initial = {
  id: "a1",
  eventName: "Summer camp",
  firstName: "Jana",
  lastName: "Nováková",
  birthDate: "2005-03-14",
  phone: null,
  accommodationRequest: null,
  history: [],
}

const renderPage = () => {
  get.mockReturnValue({ json: () => Promise.resolve(initial) })
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <EditApplicationPage applicationId="a1" />
      </QueryClientProvider>
    ),
  })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
}

describe("EditApplicationPage", () => {
  beforeEach(() => {
    get.mockReset()
    put.mockReset()
  })

  it("does not offer to save unchanged details", async () => {
    renderPage()
    expect(await screen.findByRole("button", { name: "Save changes" })).toBeDisabled()
  })

  it("saves the participant's details and shows the recorded change", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({
      json: () =>
        Promise.resolve({
          ...initial,
          phone: "+420 777 123 456",
          accommodationRequest: "Ground floor, please.",
          history: [
            {
              id: "edit-1",
              createdAt: "2026-11-06T10:30:00.000Z",
              authorName: "Jana Nováková",
              changedFields: ["phone", "accommodationRequest"],
            },
          ],
        }),
    })
    renderPage()
    await user.type(await screen.findByRole("textbox", { name: "Phone *" }), "+420 777 123 456")
    await user.type(
      screen.getByRole("textbox", { name: "Individual accommodation request" }),
      "Ground floor, please.",
    )
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(put).toHaveBeenCalledWith("participant/applications/a1/edit", {
      json: {
        firstName: "Jana",
        lastName: "Nováková",
        birthDate: "2005-03-14",
        phone: "+420 777 123 456",
        accommodationRequest: "Ground floor, please.",
      },
    })
    expect(await screen.findByRole("heading", { name: "Changes were saved" })).toBeInTheDocument()
    expect(
      screen.getByText(/Jana Nováková · Updated contact and accommodation request/),
    ).toBeInTheDocument()
  })

  it("keeps entered values on a failed save so the participant can retry", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({ json: () => Promise.reject(new Error("failed")) })
    renderPage()
    const phone = await screen.findByRole("textbox", { name: "Phone *" })
    await user.type(phone, "+420 777 123 456")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(
      await screen.findByRole("heading", { name: "Changes couldn't be saved" }),
    ).toBeInTheDocument()
    expect(phone).toHaveValue("+420 777 123 456")
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled()
  })

  it("keeps a failed field mounted while its value passes through the original value", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({ json: () => Promise.reject(new Error("failed")) })
    renderPage()
    const firstName = await screen.findByRole("textbox", { name: "First name *" })
    await user.clear(firstName)
    await user.type(firstName, "Petra")
    await user.type(screen.getByRole("textbox", { name: "Phone *" }), "+420 777 123 456")
    await user.click(screen.getByRole("button", { name: "Save changes" }))
    expect(await screen.findByRole("heading", { name: "Changes couldn't be saved" })).toBeVisible()

    await user.clear(firstName)
    await user.type(firstName, "Janax")

    expect(screen.getByRole("textbox", { name: "First name *" })).toBe(firstName)
    expect(firstName).toHaveValue("Janax")
  })
})
