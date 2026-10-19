import { createFileRoute, Outlet } from "@tanstack/react-router"
import { Calendar, LayoutGrid } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { SidebarLink } from "@/components/atoms/SidebarLink"
import { AreaLayout } from "@/components/templates/AreaLayout"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { OrganizerAreaError } from "@/features/auth/components/OrganizerAreaError"
import { requireAccount } from "@/features/auth/lib/require-account"

// Every /organizer/* page except the login sits under this layout.
export const Route = createFileRoute("/organizer/_app")({
  beforeLoad: async ({ context, location }) => {
    await requireAccount({
      queryClient: context.queryClient,
      location,
      loginRoute: ROUTES.organizer.login,
      accountType: "ORGANIZER",
    })
  },
  errorComponent: OrganizerAreaError,
  component: OrganizerLayout,
})

function OrganizerLayout() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t("area.organizer")} />
      <AreaLayout
        width="wide"
        roleLabel={t("accountRole.ORGANIZER")}
        nav={
          <>
            <SidebarLink
              to={ROUTES.organizer.dashboard}
              activeOptions={{ exact: true }}
              icon={LayoutGrid}
            >
              {t("nav.dashboard")}
            </SidebarLink>
            <SidebarLink
              to={ROUTES.organizer.events}
              icon={Calendar}
            >
              {t("nav.events")}
            </SidebarLink>
          </>
        }
        userMenu={<HeaderMenu />}
      >
        <Outlet />
      </AreaLayout>
    </>
  )
}
