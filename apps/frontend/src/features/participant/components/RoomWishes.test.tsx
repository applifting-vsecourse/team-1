import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MyApplicationTerm } from "@/features/participant/api/applications"
import { RoomWishesSection } from "@/features/participant/components/RoomWishes"

const { put, success, error } = vi.hoisted(() => ({
  put: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock("@/lib/api-client", () => ({ api: { put } }))
vi.mock("@/lib/notify", () => ({ notify: { success, error } }))

const term = (overrides: Partial<MyApplicationTerm> = {}): MyApplicationTerm => ({
  termId: "t1",
  name: "Letní týden",
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  status: "CONFIRMED",
  priceCzk: 4500,
  transportOffered: false,
  transportDecided: false,
  roomWishes: [],
  ...overrides,
})

const renderSection = (terms: MyApplicationTerm[]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RoomWishesSection
        applicationId="a1"
        terms={terms}
      />
    </QueryClientProvider>,
  )

describe("RoomWishesSection", () => {
  beforeEach(() => {
    put.mockReset().mockResolvedValue(undefined)
    success.mockReset()
    error.mockReset()
  })

  it("shows nothing for a term without wishes field (not confirmed)", () => {
    const { container } = renderSection([term({ status: "WAITLISTED", roomWishes: undefined })])
    expect(container).toBeEmptyDOMElement()
  })

  it("offers to enter wishes when there are none", () => {
    renderSection([term()])
    expect(screen.getByRole("heading", { name: "Roommate wishes" })).toBeInTheDocument()
    expect(screen.getByText("You haven't entered any wishes for this term yet.")).toBeVisible()
  })

  it("saves up to three names, dropping blank ones", async () => {
    renderSection([term()])
    await userEvent.click(screen.getByRole("button", { name: "Enter wishes" }))
    await userEvent.type(screen.getByLabelText("Name 1"), " Eva Černá ")
    await userEvent.type(screen.getByLabelText("Name 3"), "Tereza Malá")
    await userEvent.click(screen.getByRole("button", { name: "Save wishes" }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("participant/applications/a1/terms/t1/room-wishes", {
        json: { names: ["Eva Černá", "Tereza Malá"] },
      }),
    )
    await waitFor(() => expect(success).toHaveBeenCalledWith("Wishes saved"))
  })

  it("shows saved names, edits them with the current values", async () => {
    renderSection([term({ roomWishes: ["Eva Černá", "Klára Veselá"] })])
    expect(screen.getByText("Eva Černá, Klára Veselá")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Edit wishes" }))
    expect(screen.getByLabelText("Name 1")).toHaveValue("Eva Černá")
    expect(screen.getByLabelText("Name 3")).toHaveValue("")
  })

  it("deletes the wishes after a confirmation, and cancel keeps them", async () => {
    renderSection([term({ roomWishes: ["Eva Černá"] })])
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(screen.getByText("Delete roommate wishes?")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(put).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    await userEvent.click(screen.getByRole("button", { name: "Delete wishes" }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("participant/applications/a1/terms/t1/room-wishes", {
        json: { names: [] },
      }),
    )
  })

  it("tells when saving fails", async () => {
    put.mockRejectedValue(new Error("nope"))
    renderSection([term({ roomWishes: ["Eva Černá"] })])
    await userEvent.click(screen.getByRole("button", { name: "Edit wishes" }))
    await userEvent.click(screen.getByRole("button", { name: "Save wishes" }))
    await waitFor(() => expect(error).toHaveBeenCalledWith("Couldn't save the wishes", "nope"))
  })
})
