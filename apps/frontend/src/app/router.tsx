import { createRouter } from "@tanstack/react-router"

import { ErrorPage } from "@/components/pages/ErrorPage"
import { LoadingPage } from "@/components/pages/LoadingPage"
import { NotFoundPage } from "@/components/pages/NotFoundPage"
import { queryClient } from "@/config/react-query"
import { routeTree } from "@/routeTree.gen"

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: ({ error }) => <ErrorPage error={error} />,
  defaultPendingComponent: LoadingPage,
})

declare module "@tanstack/react-router" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: typeof router
  }
}
