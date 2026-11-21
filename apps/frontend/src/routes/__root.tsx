import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"

import "@/styles/global.css"

import { AppToaster } from "@/components/atoms/AppToaster"

import { useApplyPreferredLanguage } from "@/features/auth/hooks/useApplyPreferredLanguage"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  useApplyPreferredLanguage()

  return (
    <>
      <Outlet />
      <AppToaster />
    </>
  )
}
