import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TermRooms } from "@/features/events/api/rooms"
import { RoomsPublicationCard } from "@/features/events/components/RoomsPublicationCard"

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { patch } }))
vi.mock("@/lib/notify", () => ({ notify: { error: vi.fn() } }))

const renderCard = (isPublished: boolean) => {
  const onChanged = vi.fn().mockResolvedValue(undefined)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RoomsPublicationCard
        term={{ eventId: "e1", termId: "t1", roomsPublished: isPublished } as TermRooms}
        onChanged={onChanged}
      />
    </QueryClientProvider>,
  )
  return { onChanged }
}

describe("RoomsPublicationCard", () => {
  beforeEach(() => patch.mockReset().mockResolvedValue(undefined))

  it("is off when the assignment has not been published", () => {
    renderCard(false)
    expect(screen.getByRole("switch", { name: "Publish the room assignment" })).not.toBeChecked()
  })

  it("publishes the assignment of the term with one switch", async () => {
    const { onChanged } = renderCard(false)
    await userEvent.click(screen.getByRole("switch"))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(patch).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms-published", {
      json: { published: true },
    })
  })

  it("takes the publication back", async () => {
    renderCard(true)
    expect(screen.getByRole("switch")).toBeChecked()
    await userEvent.click(screen.getByRole("switch"))
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("organizer/events/e1/terms/t1/rooms-published", {
        json: { published: false },
      }),
    )
  })
})
