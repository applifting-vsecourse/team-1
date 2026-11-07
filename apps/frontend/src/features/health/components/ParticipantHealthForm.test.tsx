import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Health } from "@/features/health/api/health"
import { ParticipantHealthForm } from "@/features/health/components/ParticipantHealthForm"

const { getHealth, saveHealth, requestHealthChange } = vi.hoisted(() => ({
  getHealth: vi.fn(),
  saveHealth: vi.fn(),
  requestHealthChange: vi.fn(),
}))
vi.mock("@/features/health/api/health", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/health/api/health")>()
  return {
    ...original,
    ownHealthQueryOptions: (id: string) => ({
      queryKey: ["participant", "applications", id, "health"],
      queryFn: getHealth,
    }),
    saveHealth,
    requestHealthChange,
  }
})

const empty: Health = {
  applicationId: "a1",
  eventName: "Letní kemp Lipno 2027",
  firstName: "Adam",
  lastName: "Dvořák",
  note: null,
  consentAt: null,
  pendingRequest: null,
}

function setup(health: Health = empty) {
  getHealth.mockResolvedValue(health)
  saveHealth.mockResolvedValue({
    ...health,
    note: "Astma",
    consentAt: "2026-11-05T13:30:00.000Z",
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ParticipantHealthForm applicationId="a1" />
    </QueryClientProvider>,
  )
}

describe("ParticipantHealthForm", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows the participant and the event", async () => {
    setup()
    expect(await screen.findByText("Adam Dvořák · Letní kemp Lipno 2027")).toBeInTheDocument()
  })

  it("keeps saving disabled until the explicit consent is ticked", async () => {
    const user = userEvent.setup()
    setup()
    await user.type(await screen.findByLabelText("Participant's health restriction"), "Astma")
    const save = screen.getByRole("button", { name: "Save health data" })
    expect(save).toBeDisabled()

    await user.click(screen.getByRole("checkbox"))
    expect(save).toBeEnabled()

    await user.click(save)
    await waitFor(() =>
      expect(saveHealth).toHaveBeenCalledWith("a1", { note: "Astma", consent: true }),
    )
  })

  it("shows filled-in data read-only and sends a change as a request, not a save", async () => {
    const user = userEvent.setup()
    setup({ ...empty, note: "Astma", consentAt: "2026-11-05T13:30:00.000Z" })
    const field = await screen.findByLabelText("Participant's health restriction")
    expect(field).toHaveAttribute("readonly")
    expect(screen.queryByRole("button", { name: "Save health data" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Request a change" }))
    await user.clear(field)
    await user.type(field, "Astma, alergie")
    const send = screen.getByRole("button", { name: "Send request" })
    expect(send).toBeDisabled()
    await user.click(screen.getByRole("checkbox"))
    await user.click(send)

    await waitFor(() =>
      expect(requestHealthChange).toHaveBeenCalledWith("a1", {
        note: "Astma, alergie",
        consent: true,
      }),
    )
    expect(saveHealth).not.toHaveBeenCalled()
  })

  it("disables a new request while one awaits the organizer", async () => {
    setup({
      ...empty,
      note: "Astma",
      consentAt: "2026-11-05T13:30:00.000Z",
      pendingRequest: { note: "Nic", createdAt: "2026-11-06T10:00:00.000Z" },
    })
    expect(await screen.findByText("Request awaiting approval")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Request a change" })).toBeDisabled()
  })
})
