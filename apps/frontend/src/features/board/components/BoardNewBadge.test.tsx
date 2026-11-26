import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"

import { BoardNewBadge } from "@/features/board/components/BoardNewBadge"

const { get } = vi.hoisted(() => ({
  get: vi.fn<(path: string) => { json: () => Promise<unknown> }>(),
}))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

function renderBadge(applicationId: string, unreadByApplication: unknown[]) {
  get.mockReturnValue({
    json: () => Promise.resolve({ unreadCount: 4, latest: null, unreadByApplication }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BoardNewBadge applicationId={applicationId} />
      <p>after</p>
    </QueryClientProvider>,
  )
}

describe("BoardNewBadge", () => {
  beforeEach(() => get.mockReset())
  afterEach(async () => {
    await i18n.changeLanguage("en")
  })

  it("shows the number of new posts of the application", async () => {
    renderBadge("a1", [
      { applicationId: "a1", unreadCount: 3 },
      { applicationId: "a2", unreadCount: 1 },
    ])

    expect(await screen.findByText("3 new posts")).toBeVisible()
  })

  it("shows nothing for an application without a new post", async () => {
    renderBadge("a3", [{ applicationId: "a1", unreadCount: 3 }])

    expect(await screen.findByText("after")).toBeVisible()
    expect(screen.queryByText(/new post/)).not.toBeInTheDocument()
  })

  it.each([
    [1, "1 nový příspěvek"],
    [3, "3 nové příspěvky"],
    [5, "5 nových příspěvků"],
  ])("declines the number %i in Czech", async (count, text) => {
    await i18n.changeLanguage("cs")
    renderBadge("a1", [{ applicationId: "a1", unreadCount: count }])

    expect(await screen.findByText(text)).toBeVisible()
  })
})
