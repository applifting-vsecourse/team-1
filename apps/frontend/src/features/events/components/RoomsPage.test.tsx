import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { EventRooms, RoomMode } from "@/features/events/api/rooms"
import { RoomsPage } from "@/features/events/components/RoomsPage"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get }, apiErrorCode: () => undefined }))

function renderRooms(roomMode: RoomMode) {
  const event: EventRooms = {
    eventId: "e1",
    eventName: "Summer camp",
    organizationName: "Camp",
    roomMode,
    termCount: 2,
    rooms: [
      {
        id: "r1",
        name: "Original room",
        gender: roomMode === "GENDERED" ? "FEMALE" : null,
        capacity: 5000,
      },
    ],
    capacity: { FEMALE: roomMode === "GENDERED" ? 5000 : 0, MALE: 0, total: 5000 },
  }
  get.mockReturnValue({ json: () => Promise.resolve(event) })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={client}>
        <RoomsPage eventId="e1" />
      </QueryClientProvider>
    ),
  })
  const terms = createRoute({
    getParentRoute: () => root,
    path: "/organizer/events/$eventId/terms",
  })
  const router = createRouter({
    routeTree: root.addChildren([terms]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
}

describe("US-14 accommodation remains independent of US-26", () => {
  beforeEach(() => get.mockReset())

  it.each(["GENDERED", "SHARED"] as const)(
    "keeps reading and editing rooms available in %s mode",
    async (mode) => {
      renderRooms(mode)
      expect(await screen.findByText("Original room")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Add room" })).toBeEnabled()
      expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled()
      expect(screen.getByRole("combobox", { name: "Room mode" })).toBeEnabled()
      await userEvent.click(screen.getByRole("button", { name: "Edit" }))
      expect(await screen.findByRole("spinbutton", { name: "Capacity *" })).toHaveValue(5000)
      expect(
        screen.queryByText(/Their capacity overview is not available yet/),
      ).not.toBeInTheDocument()
    },
  )
})
