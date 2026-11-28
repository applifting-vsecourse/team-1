import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { OrganizerMealRoster } from "./OrganizerMealDetails"
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

function renderEditor(isEditable = true) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <OrganizerMealEditor
        eventId="camp"
        meals={{ ...person, editable: isEditable }}
      />
    </QueryClientProvider>,
  )
}
afterEach(() => vi.restoreAllMocks())

describe("organizer meal editor", () => {
  it("discards the draft on cancel and saves only on explicit submit", async () => {
    const writes: Request[] = []
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation((request) => {
      writes.push((request as Request).clone())
      return Promise.resolve(Response.json({ ...person, noRestrictions: true }))
    })
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
    const req = writes[0]!
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
  it("keeps the dialog open and shows the error when saving fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { statusCode: 500, code: "INTERNAL_ERROR", message: "Save failed" },
        { status: 500 },
      ),
    )
    const user = userEvent.setup()
    renderEditor()
    await user.click(screen.getByRole("button", { name: /Edit meals for Adam/ }))
    await user.click(screen.getByRole("checkbox", { name: "No restrictions" }))
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /save/i }))
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
  it("hides the action when the application is read-only", () => {
    renderEditor(false)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("organizer meal roster", () => {
  it("filters the participant table with the shared view controls and keeps editing available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json([
        person,
        {
          ...person,
          applicationId: "b",
          firstName: "Eva",
          lastName: "Malá",
          selectedOptionIds: ["veg"],
        },
      ]),
    )
    const user = userEvent.setup()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <OrganizerMealRoster
          eventId="camp"
          termId="week-one"
        />
      </QueryClientProvider>,
    )
    const filters = await screen.findByRole("radiogroup", { name: "Meal preferences status" })
    expect(within(filters).getByRole("radio", { name: "All · 2" })).toBeChecked()
    const restricted = within(filters).getByRole("radio", { name: "With restrictions · 1" })
    await user.click(restricted)
    expect(restricted).toBeChecked()
    const table = within(screen.getByRole("table", { name: "Participants" }))
    expect(table.getByRole("columnheader", { name: "Diet" })).toBeVisible()
    expect(table.queryByText("Adam Dvořák")).not.toBeInTheDocument()
    expect(table.getByText("Vegetarian")).toBeVisible()
    await user.click(restricted)
    expect(restricted).toBeChecked()
    await user.click(table.getByRole("button", { name: "Edit meals for Eva Malá" }))
    expect(screen.getByRole("dialog", { name: "Edit meal preferences" })).toBeVisible()
  })
})
