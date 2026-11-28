import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { OwnMeals } from "@/features/meals/api/meals"
import { ParticipantMeals } from "@/features/meals/components/ParticipantMeals"

const { close, success } = vi.hoisted(() => ({ close: vi.fn(), success: vi.fn() }))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock("@/lib/notify", () => ({ notify: { success } }))

const { getMeals, saveOwnMeals } = vi.hoisted(() => ({ getMeals: vi.fn(), saveOwnMeals: vi.fn() }))
vi.mock("@/features/meals/api/meals", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/meals/api/meals")>()
  return {
    ...original,
    ownMealsQueryOptions: (id: string) => ({
      queryKey: ["participant", "applications", id, "meals"],
      queryFn: getMeals,
    }),
    saveOwnMeals,
  }
})

const meals: OwnMeals = {
  applicationId: "a1",
  eventName: "Letní kemp Lipno 2027",
  firstName: "Adam",
  lastName: "Dvořák",
  options: [
    { id: "veg", name: "Vegetarian" },
    { id: "gf", name: "Gluten-free" },
  ],
  selectedOptionIds: ["gf"],
  allergies: "Peanuts",
  specialRequest: "Early dinner",
  noRestrictions: false,
  editable: true,
}

function setup(
  value: OwnMeals = meals,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  getMeals.mockResolvedValue(value)
  saveOwnMeals.mockResolvedValue(value)
  render(
    <QueryClientProvider client={client}>
      <ParticipantMeals
        applicationId="a1"
        onClose={close}
      />
    </QueryClientProvider>,
  )
}

describe("ParticipantMeals", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows the participant, the event, the offered options and the saved values", async () => {
    setup()
    expect(await screen.findByText("Adam Dvořák · Letní kemp Lipno 2027")).toBeVisible()
    expect(screen.getByRole("checkbox", { name: "Vegetarian" })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Gluten-free" })).toBeChecked()
    expect(screen.getByLabelText("Allergies and other dietary requirements")).toHaveValue("Peanuts")
    expect(screen.getByLabelText("Special request")).toHaveValue("Early dinner")
  })

  it("cannot be changed once every term is over or cancelled (D-192)", async () => {
    setup({ ...meals, editable: false })
    expect(await screen.findByRole("checkbox", { name: "Vegetarian" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
    expect(screen.getByText(/can no longer be changed/)).toBeVisible()
  })

  it("saves the ticked options and the allergies", async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole("checkbox", { name: "Vegetarian" }))
    await user.click(screen.getByRole("checkbox", { name: "Gluten-free" }))
    const allergies = screen.getByLabelText("Allergies and other dietary requirements")
    await user.clear(allergies)
    await user.type(allergies, "Milk")
    const request = screen.getByLabelText("Special request")
    await user.clear(request)
    await user.type(request, "Late arrival")
    await user.click(screen.getByRole("button", { name: "Save meals" }))

    await waitFor(() =>
      expect(saveOwnMeals).toHaveBeenCalledWith("a1", {
        optionIds: ["veg"],
        allergies: "Milk",
        specialRequest: "Late arrival",
        noRestrictions: false,
      }),
    )
  })

  it("confirms with a toast and returns to the application after saving", async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole("button", { name: "Save meals" }))
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    expect(success).toHaveBeenCalledWith("Meals saved")
  })

  it("refreshes the overview of the application so its meals step turns done (US-149)", async () => {
    const user = userEvent.setup()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidate = vi.spyOn(client, "invalidateQueries")
    setup(meals, client)
    await user.click(await screen.findByRole("button", { name: "Save meals" }))
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["participant", "applications", "a1"] }),
    )
  })

  it("shows the error and stays on the form when saving fails", async () => {
    const user = userEvent.setup()
    setup()
    saveOwnMeals.mockRejectedValue(new Error("Server said no"))
    await user.click(await screen.findByRole("button", { name: "Save meals" }))
    expect(await screen.findByText("Server said no")).toBeVisible()
    expect(close).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
  })

  it("does not send an option the organizer has removed", async () => {
    const user = userEvent.setup()
    setup({ ...meals, selectedOptionIds: ["gf", "removed"] })
    await user.click(await screen.findByRole("button", { name: "Save meals" }))
    await waitFor(() =>
      expect(saveOwnMeals).toHaveBeenCalledWith("a1", {
        optionIds: ["gf"],
        allergies: "Peanuts",
        specialRequest: "Early dinner",
        noRestrictions: false,
      }),
    )
  })

  it("confirms having no restriction: the fields are disabled and nothing else is sent (US-150)", async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole("checkbox", { name: "I have no dietary restriction" }))
    expect(screen.getByRole("checkbox", { name: "Vegetarian" })).toBeDisabled()
    expect(screen.getByLabelText("Allergies and other dietary requirements")).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Save meals" }))
    await waitFor(() =>
      expect(saveOwnMeals).toHaveBeenCalledWith("a1", {
        optionIds: [],
        allergies: "",
        specialRequest: "",
        noRestrictions: true,
      }),
    )
  })

  it("shows the saved confirmation and lets a restriction cancel it", async () => {
    const user = userEvent.setup()
    setup({
      ...meals,
      selectedOptionIds: [],
      allergies: null,
      specialRequest: null,
      noRestrictions: true,
    })
    const none = await screen.findByRole("checkbox", { name: "I have no dietary restriction" })
    expect(none).toBeChecked()
    await user.click(none)
    await user.type(screen.getByLabelText("Allergies and other dietary requirements"), "Milk")
    await user.click(screen.getByRole("button", { name: "Save meals" }))
    await waitFor(() =>
      expect(saveOwnMeals).toHaveBeenCalledWith("a1", {
        optionIds: [],
        allergies: "Milk",
        specialRequest: "",
        noRestrictions: false,
      }),
    )
  })

  it("shows only the allergies field when the organizer offers no option", async () => {
    setup({ ...meals, options: [], selectedOptionIds: [], allergies: null, specialRequest: null })
    expect(await screen.findByLabelText("Allergies and other dietary requirements")).toHaveValue("")
    expect(screen.getAllByRole("checkbox")).toHaveLength(1)
  })
})
