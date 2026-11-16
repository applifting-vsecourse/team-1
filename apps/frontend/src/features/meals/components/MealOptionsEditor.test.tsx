import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MealOptionsEditor } from "@/features/meals/components/MealOptionsEditor"

const { getOptions, saveMealOptions } = vi.hoisted(() => ({
  getOptions: vi.fn(),
  saveMealOptions: vi.fn(),
}))
vi.mock("@/features/meals/api/meals", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/meals/api/meals")>()
  return {
    ...original,
    mealOptionsQueryOptions: (id: string) => ({
      queryKey: ["organizer", "events", id, "meals", "options"],
      queryFn: getOptions,
    }),
    saveMealOptions,
  }
})

const options = [
  { id: "veg", name: "Vegetarian" },
  { id: "gf", name: "Gluten-free" },
]

function setup() {
  getOptions.mockResolvedValue(options)
  saveMealOptions.mockResolvedValue(options)
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MealOptionsEditor eventId="e1" />
    </QueryClientProvider>,
  )
}

describe("MealOptionsEditor", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lists the offered restrictions", async () => {
    setup()
    expect(await screen.findByRole("heading", { name: "Meal options" })).toBeVisible()
    expect(
      screen
        .getAllByRole("textbox", { name: "Restriction name" })
        .map((i) => (i as HTMLInputElement).value),
    ).toEqual(["Vegetarian", "Gluten-free"])
  })

  it("adds, renames and removes restrictions and saves the whole list", async () => {
    const user = userEvent.setup()
    setup()
    await user.click(await screen.findByRole("button", { name: "Remove Gluten-free" }))
    await user.click(screen.getByRole("button", { name: "Add restriction" }))
    const inputs = screen.getAllByRole("textbox", { name: "Restriction name" })
    await user.type(inputs[1]!, "Vegan")
    await user.click(screen.getByRole("button", { name: "Save options" }))

    await waitFor(() =>
      expect(saveMealOptions).toHaveBeenCalledWith("e1", [
        { id: "veg", name: "Vegetarian" },
        { id: undefined, name: "Vegan" },
      ]),
    )
  })
})
