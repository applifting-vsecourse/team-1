import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory, createRouter } from "@tanstack/react-router"
import { describe, expect, it } from "vitest"

import { routeTree } from "@/routeTree.gen"

describe("participant application edit route", () => {
  it("renders as a sibling of the application detail, which has no Outlet", () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/participant/applications/a1/edit"] }),
      context: { queryClient: new QueryClient() },
    })

    const routeIds = router
      .matchRoutes("/participant/applications/a1/edit")
      .map((match) => match.routeId)
    expect(routeIds).toContain("/participant/_app/applications_/$applicationId/edit")
    expect(routeIds).not.toContain("/participant/_app/applications/$applicationId")
  })
})
