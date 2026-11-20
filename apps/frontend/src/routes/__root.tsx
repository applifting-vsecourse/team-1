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
      {/* Figma (Design system v2): toast on a white surface, icon in the tone colour, close button
          · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19795-14950 */}
      <Toaster
        closeButton
        position="bottom-right"
        offset={24}
        mobileOffset={16}
      />
    </>
  )
}
