import { createFileRoute, Outlet } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { NavLink } from "@/components/atoms/NavLink"
import { Seo } from "@/components/atoms/Seo"
import { AreaLayout } from "@/components/templates/AreaLayout"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { requireSession } from "@/features/auth/lib/require-session"

// Every /ucastnik/* page except login and set-password sits under this layout.
// TODO(phase 0 PR 2): an organizer account gets 403 here.
export const Route = createFileRoute("/ucastnik/_app")({
  loader: async ({ context, location }) => {
    await requireSession({
      queryClient: context.queryClient,
      location,
      loginRoute: ROUTES.participant.login,
    })
  },
  component: ParticipantLayout,
})

function ParticipantLayout() {
  return (
    <>
      <Seo title="Moje přihláška" />
      <AreaLayout
        width="reading"
        nav={
          <>
            <NavLink
              to={ROUTES.participant.applications}
              activeOptions={{ exact: true }}
            >
              Moje přihláška
            </NavLink>
            <NavLink to={ROUTES.participant.account}>Účet</NavLink>
          </>
        }
        userMenu={<HeaderMenu />}
      >
        <Outlet />
      </AreaLayout>
    </>
  )
}
