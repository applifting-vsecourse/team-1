import { createFileRoute, Outlet } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { NavLink } from "@/components/atoms/NavLink"
import { Seo } from "@/components/atoms/Seo"
import { AreaLayout } from "@/components/templates/AreaLayout"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { requireSession } from "@/features/auth/lib/require-session"

// Every /organizator/* page except the login sits under this layout.
// TODO(US-02, phase 0 PR 2): a participant account gets 403 here.
export const Route = createFileRoute("/organizator/_app")({
  loader: async ({ context, location }) => {
    await requireSession({
      queryClient: context.queryClient,
      location,
      loginRoute: ROUTES.organizer.login,
    })
  },
  component: OrganizerLayout,
})

function OrganizerLayout() {
  return (
    <>
      <Seo title="Organizátor" />
      <AreaLayout
        width="wide"
        nav={
          <>
            <NavLink
              to={ROUTES.organizer.dashboard}
              activeOptions={{ exact: true }}
            >
              Přehled
            </NavLink>
            <NavLink to={ROUTES.organizer.events}>Akce</NavLink>
          </>
        }
        userMenu={<HeaderMenu />}
      >
        <Outlet />
      </AreaLayout>
    </>
  )
}
