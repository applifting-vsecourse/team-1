import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { OwnMeals } from "@/features/meals/api/meals"
import { ParticipantMeals } from "@/features/meals/components/ParticipantMeals"

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
}

function setup(value: OwnMeals = meals) {
  getMeals.mockResolvedValue(value)
  saveOwnMeals.mockResolvedValue(value)
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ParticipantMeals applicationId="a1" />
    </QueryClientProvider>,
  )
}

describe("ParticipantMeals", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows the participant, the event, the offered options and the saved values", async () => {
    setup()
    expect(await screen.findByRole("heading", { name: "Meals · Adam Dvořák" })).toBeVisible()
    expect(screen.getByText("Letní kemp Lipno 2027")).toBeVisible()
    expect(screen.getByRole("checkbox", { name: "Vegetarian" })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Gluten-free" })).toBeChecked()
    expect(screen.getByLabelText("Allergies and other dietary restrictions")).toHaveValue("Peanuts")
  })

  it("saves the ticked options and the allergies", async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole("checkbox", { name: "Vegetarian" }))
    await user.click(screen.getByRole("checkbox", { name: "Gluten-free" }))
    const allergies = screen.getByLabelText("Allergies and other dietary restrictions")
    await user.clear(allergies)
    await user.type(allergies, "Milk")
    await user.click(screen.getByRole("button", { name: "Save meals" }))

    await waitFor(() =>
      expect(saveOwnMeals).toHaveBeenCalledWith("a1", { optionIds: ["veg"], allergies: "Milk" }),
    )
  })

  it("does not send an option the organizer has removed", async () => {
    const user = userEvent.setup()
    setup({ ...meals, selectedOptionIds: ["gf", "removed"] })
    await user.click(await screen.findByRole("button", { name: "Save meals" }))
    await waitFor(() =>
      expect(saveOwnMeals).toHaveBeenCalledWith("a1", { optionIds: ["gf"], allergies: "Peanuts" }),
    )
  })

  it("shows only the allergies field when the organizer offers no option", async () => {
    setup({ ...meals, options: [], selectedOptionIds: [], allergies: null })
    expect(await screen.findByLabelText("Allergies and other dietary restrictions")).toHaveValue("")
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  })
})
