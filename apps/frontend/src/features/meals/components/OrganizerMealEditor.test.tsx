import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { OrganizerMealEditor } from "./OrganizerMealEditor"

const person = {
  applicationId: "a",
  eventName: "Camp",
  firstName: "Adam",
  lastName: "Dvořák",
  options: [{ id: "veg", name: "Vegetarian" }],
  selectedOptionIds: [],
  allergies: null,
  specialRequest: null,
  noRestrictions: false,
  editable: true,
}

function renderEditor(editable = true) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <OrganizerMealEditor
        eventId="camp"
        meals={{ ...person, editable }}
      />
    </QueryClientProvider>,
  )
}
afterEach(() => vi.restoreAllMocks())

describe("organizer meal editor", () => {
  it("discards the draft on cancel and saves only on explicit submit", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ...person, noRestrictions: true }), {
          headers: { "Content-Type": "application/json" },
        }),
      )
    const user = userEvent.setup()
    renderEditor()
    const edit = screen.getByRole("button", { name: /Edit meals for Adam/ })
    await user.click(edit)
    await user.click(screen.getByRole("checkbox", { name: "Vegetarian" }))
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(fetch).not.toHaveBeenCalled()
    await user.click(edit)
    const dialog = within(screen.getByRole("dialog"))
    expect(dialog.getByRole("checkbox", { name: "Vegetarian" })).not.toBeChecked()
    await user.click(dialog.getByRole("checkbox", { name: "No restrictions" }))
    await user.click(dialog.getByRole("button", { name: /save/i }))
    expect(fetch).toHaveBeenCalledTimes(1)
    const req = fetch.mock.calls[0]![0] as Request
    expect(req.method).toBe("PUT")
    expect(req.url).toContain("/organizer/events/camp/meals/applications/a")
    expect(await req.json()).toEqual({
      optionIds: [],
      allergies: "",
      specialRequest: "",
      noRestrictions: true,
    })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
  it("hides the action when the application is read-only", () => {
    renderEditor(false)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
