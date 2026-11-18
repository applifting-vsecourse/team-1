import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"

import "@/styles/global.css"

import { Toaster } from "@/components/ui/sonner"

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
      <Toaster
        richColors
        position="bottom-right"
      />
    </>
  )
}
