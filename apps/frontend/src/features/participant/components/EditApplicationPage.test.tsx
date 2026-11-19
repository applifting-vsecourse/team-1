import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

import { EditApplicationPage } from "@/features/participant/components/EditApplicationPage"

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, put } }))
vi.mock("@/lib/notify", () => ({
  notify: { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))

const initial = {
  id: "a1",
  eventName: "Summer camp",
  firstName: "Jana",
  lastName: "Nováková",
  birthDate: "2005-03-14",
  phone: null,
  individualAccommodation: true,
  accommodationRequest: null,
  history: [],
}

const renderPage = () => {
  get.mockReturnValue({ json: () => Promise.resolve(initial) })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderEdit(client)
}

/** The edit page at its own path, with the application detail as a stand-in next to it. */
const renderEdit = (client: QueryClient) => {
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={client}>
        <Outlet />
      </QueryClientProvider>
    ),
  })
  const edit = createRoute({
    getParentRoute: () => root,
    path: "/participant/applications/$applicationId/edit",
    component: () => <EditApplicationPage applicationId="a1" />,
  })
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/participant/applications/$applicationId",
    component: () => <h1>Application detail</h1>,
  })
  render(
    <RouterProvider
      router={createRouter({
        routeTree: root.addChildren([edit, detail]),
        history: createMemoryHistory({ initialEntries: ["/participant/applications/a1/edit"] }),
      })}
    />,
  )
  return client
}

describe("EditApplicationPage", () => {
  beforeEach(() => {
    get.mockReset()
    put.mockReset()
    vi.mocked(notify.success).mockClear()
  })

  it("does not offer to save unchanged details", async () => {
    renderPage()
    expect(await screen.findByRole("button", { name: "Save changes" })).toBeDisabled()
  })

  it("saves the participant's details, returns to the application and confirms with a toast", async () => {
    const user = userEvent.setup()
    put.mockReturnValue({ json: () => Promise.resolve(initial) })
    renderPage()
    await user.type(await screen.findByRole("textbox", { name: "Phone *" }), "+420 777 123 456")
    await user.type(
      screen.getByRole("textbox", { name: "Note for the organizer (optional)" }),
      "Ground floor, please.",
    )
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(put).toHaveBeenCalledWith("participant/applications/a1/edit", {
      json: {
        firstName: "Jana",
        lastName: "Nováková",
        birthDate: "2005-03-14",
        phone: "+420 777 123 456",
        individualAccommodation: true,
        accommodationRequest: "Ground floor, please.",
      },
    })
    expect(await screen.findByRole("heading", { name: "Application detail" })).toBeInTheDocument()
    expect(notify.success).toHaveBeenCalledWith(
      "Changes saved",
      "The organizer received a notification.",
    )
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
      name: "Note for the organizer (optional)",
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
    expect(screen.getByRole("textbox", { name: "Note for the organizer (optional)" })).toBe(
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
        individualAccommodation: true,
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
      expect(
        screen.getByRole("textbox", { name: "Note for the organizer (optional)" }),
      ).toHaveValue("Ground floor"),
    )
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()
  })

  it("refreshes a reverted field while preserving an explicitly cleared optional field", async () => {
    const user = userEvent.setup()
    const client = renderPage()
    const firstName = await screen.findByRole("textbox", { name: "First name *" })
    const accommodation = screen.getByRole("textbox", { name: "Note for the organizer (optional)" })
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

  describe("request for individual accommodation (US-38)", () => {
    const withoutRequest = { ...initial, individualAccommodation: false }
    const renderUnticked = () => {
      get.mockReturnValue({ json: () => Promise.resolve(withoutRequest) })
      renderEdit(new QueryClient({ defaultOptions: { queries: { retry: false } } }))
    }
    const box = () =>
      screen.findByRole("checkbox", { name: "I want to arrange the accommodation individually" })
    const note = () => screen.queryByRole("textbox", { name: "Note for the organizer (optional)" })

    it("asks for the note only once the box is ticked and says who sees it", async () => {
      const user = userEvent.setup()
      renderUnticked()
      await user.click(await box())
      expect(screen.getByText("Only the event organizer will see this.")).toBeInTheDocument()
      expect(note()).toBeInTheDocument()
      await user.click(await box())
      expect(note()).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()
    })

    it("shows how much of the 2,000 characters the note uses", async () => {
      const user = userEvent.setup()
      renderUnticked()
      await user.click(await box())
      expect(screen.getByText("0 / 2,000")).toBeInTheDocument()
      await user.type(note()!, "Ground")
      expect(screen.getByText("6 / 2,000")).toBeInTheDocument()
    })

    it("saves the ticked box with its note and records one accommodation change", async () => {
      const user = userEvent.setup()
      put.mockReturnValue({
        json: () =>
          Promise.resolve({
            ...initial,
            individualAccommodation: true,
            accommodationRequest: "Ground floor",
            history: [
              {
                id: "edit-1",
                createdAt: "2026-11-06T10:30:00.000Z",
                authorName: "Jana Nováková",
                changedFields: ["individualAccommodation", "accommodationRequest"],
              },
            ],
          }),
      })
      renderUnticked()
      await user.click(await box())
      await user.type(note()!, "Ground floor")
      await user.type(screen.getByRole("textbox", { name: "Phone *" }), "+420 777 123 456")
      await user.click(screen.getByRole("button", { name: "Save changes" }))

      expect(put).toHaveBeenCalledWith("participant/applications/a1/edit", {
        json: {
          firstName: "Jana",
          lastName: "Nováková",
          birthDate: "2005-03-14",
          phone: "+420 777 123 456",
          individualAccommodation: true,
          accommodationRequest: "Ground floor",
        },
      })
      expect(await screen.findByRole("heading", { name: "Application detail" })).toBeVisible()
      expect(notify.success).toHaveBeenCalledOnce()
    })

    it("sends no note when the box is unticked", async () => {
      const user = userEvent.setup()
      get.mockReturnValue({
        json: () =>
          Promise.resolve({ ...initial, accommodationRequest: "Ground floor", history: [] }),
      })
      put.mockReturnValue({ json: () => Promise.resolve(withoutRequest) })
      renderPage()
      get.mockReturnValue({
        json: () =>
          Promise.resolve({ ...initial, accommodationRequest: "Ground floor", history: [] }),
      })
      await user.click(await box())
      await user.type(screen.getByRole("textbox", { name: "Phone *" }), "+420 777 123 456")
      await user.click(screen.getByRole("button", { name: "Save changes" }))
      expect(put).toHaveBeenCalledWith("participant/applications/a1/edit", {
        json: {
          firstName: "Jana",
          lastName: "Nováková",
          birthDate: "2005-03-14",
          phone: "+420 777 123 456",
          individualAccommodation: false,
          accommodationRequest: null,
        },
      })
    })

    it("shows an error under a note over 2,000 characters and does not save it", async () => {
      renderUnticked()
      const user = userEvent.setup()
      await user.click(await box())
      fireEvent.change(note()!, { target: { value: "x".repeat(2001) } })
      await user.click(screen.getByRole("button", { name: "Save changes" }))
      expect(screen.getByText("The note can have at most 2,000 characters.")).toBeVisible()
      expect(put).not.toHaveBeenCalled()
    })
  })
})
