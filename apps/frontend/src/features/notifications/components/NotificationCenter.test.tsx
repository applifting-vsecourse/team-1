import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { NotificationFeed } from "@/components/organisms/NotificationPanel"

import type { AppNotification } from "@/features/notifications/api/notifications"
import { NotificationCenter } from "@/features/notifications/components/NotificationCenter"

const { get, post, navigate } = vi.hoisted(() => ({
  get: vi.fn<(path: string) => { json: () => Promise<unknown> }>(),
  post: vi.fn<(path: string) => Promise<unknown>>(() => Promise.resolve({})),
  navigate: vi.fn<(options: unknown) => Promise<void>>(() => Promise.resolve()),
}))
vi.mock("@/lib/api-client", () => ({ api: { get, post } }))
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))

const notification = (id: string, overrides: Partial<AppNotification> = {}): AppNotification => ({
  id,
  type: "STATUS_CHANGED",
  kind: "CONFIRMED",
  applicationId: "app-1",
  params: {
    eventName: "Letní kemp Lipno 2027",
    participantName: "Adam Dvořák",
    termStartsOn: "2027-07-12",
    termEndsOn: "2027-07-18",
  },
  createdAt: "2027-03-11T09:32:00.000Z",
  readAt: null,
  ...overrides,
})

/** Serves what the API would: the list and the count derived from it. */
function serve(list: AppNotification[] | Error) {
  get.mockImplementation((path) => ({
    json: () => {
      if (list instanceof Error) return Promise.reject(list)
      if (path === "notifications/unread-count") {
        return Promise.resolve({ count: list.filter((item) => item.readAt === null).length })
      }
      return Promise.resolve(list)
    },
  }))
}

function renderCenter(additionalFeed?: NotificationFeed, area?: "participant" | "organizer") {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <NotificationCenter
        additionalFeed={additionalFeed}
        area={area}
      />
    </QueryClientProvider>,
  )
}

const open = async () => {
  await userEvent.click(screen.getByRole("button", { name: /^Notifications/ }))
  return screen.findByRole("dialog")
}

describe("NotificationCenter", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockClear()
    navigate.mockClear()
  })

  it("shows the number of unread notifications next to the bell", async () => {
    serve([
      notification("1"),
      notification("2"),
      notification("3", { readAt: "2027-03-12T08:00:00.000Z" }),
    ])
    renderCenter()

    expect(await screen.findByRole("button", { name: "Notifications, 2 unread" })).toBeVisible()
  })

  const requestFeed = (): NotificationFeed => ({
    items: [
      {
        id: "n1",
        applicationId: "request-app",
        createdAt: "2027-03-12T09:32:00.000Z",
        isUnread: true,
        title: "Change request approved",
        participant: "Summer camp",
        context: "",
        time: "12. 3. 2027",
      },
    ],
    unreadCount: 1,
    state: "ready",
    onRetry: vi.fn(),
    onMarkRead: vi.fn(),
    onMarkAllRead: vi.fn(),
  })

  it("combines both sources under one bell and opens a change request with a colliding id", async () => {
    serve([notification("n1")])
    const feed = requestFeed()
    renderCenter(feed)
    expect(await screen.findByRole("button", { name: "Notifications, 2 unread" })).toBeVisible()
    expect(screen.getAllByRole("button", { name: /^Notifications/ })).toHaveLength(1)
    const panel = within(await open())
    const articles = await panel.findAllByRole("article")
    expect(articles).toHaveLength(2)
    expect(articles[0]).toHaveTextContent("Change request approved")
    await userEvent.click(
      panel.getByRole("button", { name: /Change request approved.*Application detail/ }),
    )
    expect(feed.onMarkRead).toHaveBeenCalledWith("n1")
    expect(post).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith({
      to: "/participant/applications/$applicationId",
      params: { applicationId: "request-app" },
    })
  })

  it("marks both sources as read", async () => {
    serve([notification("n1")])
    const feed = requestFeed()
    renderCenter(feed)
    const panel = within(await open())
    await userEvent.click(await panel.findByRole("button", { name: "Mark all as read" }))
    expect(post).toHaveBeenCalledWith("notifications/read-all")
    expect(feed.onMarkAllRead).toHaveBeenCalled()
  })

  it("retries both sources when the change request source fails", async () => {
    serve([])
    const feed = { ...requestFeed(), state: "error" as const }
    renderCenter(feed)
    const panel = within(await open())
    await userEvent.click(await panel.findByRole("button", { name: "Try again" }))
    expect(feed.onRetry).toHaveBeenCalled()
    expect(get).toHaveBeenCalledWith("notifications")
  })

  it("hides the number when everything is read", async () => {
    serve([notification("1", { readAt: "2027-03-12T08:00:00.000Z" })])
    renderCenter()

    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(await screen.findByRole("button", { name: "Notifications" })).toBeVisible()
  })

  it("lists the notifications, unread ones with the new badge", async () => {
    serve([notification("1"), notification("2", { readAt: "2027-03-12T08:00:00.000Z" })])
    renderCenter()
    const panel = within(await open())

    expect(await panel.findAllByText("Application confirmed")).toHaveLength(2)
    expect(panel.getAllByRole("article")).toHaveLength(2)
    expect(panel.getByText("New")).toBeVisible()
    expect(panel.getByText("Read")).toBeVisible()
    expect(panel.getByRole("button", { name: "Mark all as read" })).toBeVisible()
    expect(panel.getAllByRole("button", { name: "Mark as read" })).toHaveLength(1)
  })

  it("shows the loading state while the list is fetched", async () => {
    get.mockImplementation((path) => ({
      json: () =>
        path === "notifications/unread-count"
          ? Promise.resolve({ count: 0 })
          : new Promise<never>(() => undefined),
    }))
    renderCenter()
    const panel = within(await open())

    expect(panel.getByRole("status")).toHaveTextContent("Loading…")
  })

  it("shows the error state and retries", async () => {
    serve(new Error("boom"))
    renderCenter()
    const panel = within(await open())

    expect(await panel.findByText("The notifications couldn't be loaded.")).toBeVisible()
    serve([])
    await userEvent.click(panel.getByRole("button", { name: "Try again" }))
    expect(await panel.findByText("No notifications yet.")).toBeVisible()
  })

  it("shows the empty state", async () => {
    serve([])
    renderCenter()
    const panel = within(await open())

    expect(await panel.findByText("No notifications yet.")).toBeVisible()
    expect(panel.getByText("Changes to applications and payments will appear here.")).toBeVisible()
    expect(panel.queryByRole("button", { name: "Mark all as read" })).not.toBeInTheDocument()
  })

  it("has no mark-all action when everything is read", async () => {
    serve([notification("1", { readAt: "2027-03-12T08:00:00.000Z" })])
    renderCenter()
    const panel = within(await open())

    expect(await panel.findByText("Read")).toBeVisible()
    expect(panel.queryByRole("button", { name: "Mark all as read" })).not.toBeInTheDocument()
    expect(panel.queryByRole("button", { name: "Mark as read" })).not.toBeInTheDocument()
  })

  it("marks one notification as read", async () => {
    serve([notification("n1"), notification("n2")])
    renderCenter()
    const panel = within(await open())

    await userEvent.click((await panel.findAllByRole("button", { name: "Mark as read" }))[0]!)

    expect(post).toHaveBeenCalledWith("notifications/n1/read")
  })

  it("marks all as read", async () => {
    serve([notification("n1"), notification("n2")])
    renderCenter()
    const panel = within(await open())

    await userEvent.click(await panel.findByRole("button", { name: "Mark all as read" }))

    expect(post).toHaveBeenCalledWith("notifications/read-all")
  })

  it("opens the application, marking the notification as read", async () => {
    serve([notification("n1", { applicationId: "app-7" })])
    renderCenter()
    const panel = within(await open())

    await userEvent.click(await panel.findByRole("button", { name: /Application detail/ }))

    expect(post).toHaveBeenCalledWith("notifications/n1/read")
    expect(navigate).toHaveBeenCalledWith({
      to: "/participant/applications/$applicationId",
      params: { applicationId: "app-7" },
    })
  })

  it("opens an edited application in the organizer area", async () => {
    serve([
      notification("n1", {
        type: "REQUEST",
        kind: "APPLICATION_EDITED",
        applicationId: "app-7",
        params: {
          eventId: "event-3",
          eventName: "Letní kemp Lipno 2027",
          participantName: "Adam Dvořák",
        },
      }),
    ])
    renderCenter(undefined, "organizer")
    const panel = within(await open())

    expect(await panel.findByText("The applicant edited an application")).toBeVisible()
    await userEvent.click(panel.getByRole("button", { name: /Application detail/ }))

    expect(post).toHaveBeenCalledWith("notifications/n1/read")
    expect(navigate).toHaveBeenCalledWith({
      to: "/organizer/events/$eventId/applications/$applicationId",
      params: { eventId: "event-3", applicationId: "app-7" },
    })
  })

  it("is a modal that fits the screen at 360 px", async () => {
    window.innerWidth = 360
    serve([notification("1")])
    renderCenter()
    const dialog = await open()

    // At 360 px the panel stays a modal that fits the screen and scrolls; from `md` up it is a card
    // under the bell.
    expect(dialog).toHaveClass("max-h-[calc(100svh-2rem)]", "overflow-hidden", "sm:max-w-110")
    expect(await within(dialog).findByRole("button", { name: /Application detail/ })).toBeVisible()
  })
})
