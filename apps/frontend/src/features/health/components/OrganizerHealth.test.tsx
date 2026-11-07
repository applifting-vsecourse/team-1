import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Health } from "@/features/health/api/health"
import { OrganizerHealth } from "@/features/health/components/OrganizerHealth"

const { getHealth } = vi.hoisted(() => ({ getHealth: vi.fn() }))
vi.mock("@/features/health/api/health", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/health/api/health")>()
  return {
    ...original,
    organizerHealthQueryOptions: (id: string) => ({
      queryKey: ["organizer", "applications", id, "health"],
      queryFn: getHealth,
    }),
  }
})

const health: Health = {
  applicationId: "a1",
  eventName: "Letní kemp Lipno 2027",
  firstName: "Adam",
  lastName: "Dvořák",
  note: "Astma · inhalátor u sebe.",
  consentAt: "2026-11-05T13:30:00.000Z",
  pendingRequest: null,
}

function setup(value: Health) {
  getHealth.mockResolvedValue(value)
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <OrganizerHealth applicationId="a1" />
    </QueryClientProvider>,
  )
}

describe("OrganizerHealth", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows the note and when the consent was given", async () => {
    setup(health)
    expect(
      await screen.findByRole("heading", { name: "Health restriction · Adam Dvořák" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Astma · inhalátor u sebe.")).toBeInTheDocument()
    expect(screen.getByText(/Explicit consent given · /)).toBeInTheDocument()
  })

  it("says so when nothing was entered", async () => {
    setup({ ...health, note: null, consentAt: null })
    expect(
      await screen.findByText("The participant has not entered a health restriction."),
    ).toBeInTheDocument()
  })
})
