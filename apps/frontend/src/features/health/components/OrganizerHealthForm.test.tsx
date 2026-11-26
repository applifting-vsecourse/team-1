import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OrganizerHealthForm } from "@/features/health/components/OrganizerHealthForm"

const { saveOrganizerHealth } = vi.hoisted(() => ({ saveOrganizerHealth: vi.fn() }))
vi.mock("@/features/health/api/health", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/health/api/health")>()
  return { ...original, saveOrganizerHealth }
})

const CONSENT = /I confirm that I have the applicant’s explicit consent/
const SAVE = "Save for the participant"

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OrganizerHealthForm applicationId="a1" />
    </QueryClientProvider>,
  )
}

describe("OrganizerHealthForm (#789)", () => {
  beforeEach(() => {
    saveOrganizerHealth.mockReset().mockResolvedValue({})
  })

  it("does not save a note until the organizer confirms the applicant's consent", async () => {
    setup()
    await userEvent.type(screen.getByLabelText("Participant's health restriction"), "Asthma")
    expect(screen.getByRole("button", { name: SAVE })).toBeDisabled()
    await userEvent.click(screen.getByRole("checkbox", { name: CONSENT }))
    expect(screen.getByRole("button", { name: SAVE })).toBeEnabled()
    await userEvent.click(screen.getByRole("button", { name: SAVE }))
    await waitFor(() =>
      expect(saveOrganizerHealth).toHaveBeenCalledWith("a1", {
        note: "Asthma",
        noRestriction: false,
        consentConfirmed: true,
      }),
    )
  })

  it("confirms „no restriction“ for the participant, also only with the consent", async () => {
    setup()
    await userEvent.click(screen.getByRole("checkbox", { name: "I have no health restriction" }))
    expect(screen.getByRole("button", { name: SAVE })).toBeDisabled()
    await userEvent.click(screen.getByRole("checkbox", { name: CONSENT }))
    await userEvent.click(screen.getByRole("button", { name: SAVE }))
    await waitFor(() =>
      expect(saveOrganizerHealth).toHaveBeenCalledWith("a1", {
        note: "",
        noRestriction: true,
        consentConfirmed: true,
      }),
    )
  })

  it("has nothing to save while nothing is entered", () => {
    setup()
    expect(screen.getByRole("button", { name: SAVE })).toBeDisabled()
  })
})
