import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, render, screen, waitFor } from "@testing-library/react"
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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={client}>
        <EditApplicationPage applicationId="a1" />
      </QueryClientProvider>
    ),
  })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
  return client
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

  it("keeps unsaved values when refreshing application data fails", async () => {
    const user = userEvent.setup()
    const client = renderPage()
    const phone = await screen.findByRole("textbox", { name: "Phone *" })
    await user.type(phone, "+420 777 123 456")

    get.mockReturnValue({ json: () => Promise.reject(new Error("offline")) })
    await act(async () => {
      await client.refetchQueries({ queryKey: ["participant", "applications", "a1", "edit"] })
    })

    expect(screen.getByRole("textbox", { name: "Phone *" })).toBe(phone)
    expect(phone).toHaveValue("+420 777 123 456")
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled()
    expect(await screen.findByRole("button", { name: "Try again" })).toBeVisible()
  })

  it("refreshes untouched fields without losing a local edit or submitting stale values", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({ json: () => Promise.resolve(initial) })
    const client = renderPage()
    const accommodation = await screen.findByRole("textbox", {
      name: "Individual accommodation request",
    })
    await user.type(accommodation, "Ground floor, please.")
    const refreshed = {
      ...initial,
      firstName: "Petra",
      lastName: "Nová",
      birthDate: "2001-02-03",
      phone: "+420 777 999 888",
      accommodationRequest: "Another tab's request",
    }
    get.mockReturnValue({ json: () => Promise.resolve(refreshed) })
    await act(async () => {
      await client.refetchQueries({ queryKey: ["participant", "applications", "a1", "edit"] })
    })

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "First name *" })).toHaveValue("Petra"),
    )
    expect(screen.getByRole("textbox", { name: "Last name *" })).toHaveValue("Nová")
    expect(screen.getByLabelText("Date of birth *")).toHaveValue("2001-02-03")
    expect(screen.getByRole("textbox", { name: "Phone *" })).toHaveValue(refreshed.phone)
    expect(screen.getByRole("textbox", { name: "Individual accommodation request" })).toBe(
      accommodation,
    )
    expect(accommodation).toHaveValue("Ground floor, please.")
    await user.click(screen.getByRole("button", { name: "Save changes" }))
    expect(put).toHaveBeenCalledWith("participant/applications/a1/edit", {
      json: {
        firstName: refreshed.firstName,
        lastName: refreshed.lastName,
        birthDate: refreshed.birthDate,
        phone: refreshed.phone,
        accommodationRequest: "Ground floor, please.",
      },
    })
  })

  it("keeps an untouched refreshed form unchanged and updates the accommodation request", async () => {
    const client = renderPage()
    await screen.findByRole("button", { name: "Save changes" })
    get.mockReturnValue({
      json: () => Promise.resolve({ ...initial, accommodationRequest: "Ground floor" }),
    })
    await act(async () => {
      await client.refetchQueries({ queryKey: ["participant", "applications", "a1", "edit"] })
    })

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Individual accommodation request" })).toHaveValue(
        "Ground floor",
      ),
    )
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()
  })

  it("refreshes a reverted field while preserving an explicitly cleared optional field", async () => {
    const user = userEvent.setup()
    const client = renderPage()
    const firstName = await screen.findByRole("textbox", { name: "First name *" })
    const accommodation = screen.getByRole("textbox", { name: "Individual accommodation request" })
    get.mockReturnValue({
      json: () => Promise.resolve({ ...initial, accommodationRequest: "Ground floor" }),
    })
    await act(async () => {
      await client.refetchQueries({ queryKey: ["participant", "applications", "a1", "edit"] })
    })
    await waitFor(() => expect(accommodation).toHaveValue("Ground floor"))
    await user.clear(accommodation)
    await user.type(firstName, "x")
    await user.clear(firstName)
    await user.type(firstName, initial.firstName)
    get.mockReturnValue({
      json: () =>
        Promise.resolve({ ...initial, firstName: "Petra", accommodationRequest: "Upper floor" }),
    })
    await act(async () => {
      await client.refetchQueries({ queryKey: ["participant", "applications", "a1", "edit"] })
    })

    await waitFor(() => expect(firstName).toHaveValue("Petra"))
    expect(accommodation).toHaveValue("")
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled()
  })
})
