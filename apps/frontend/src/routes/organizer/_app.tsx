import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { NavLink } from "@/components/atoms/NavLink"
import { Seo } from "@/components/atoms/Seo"
import { AreaErrorPage } from "@/components/pages/AreaErrorPage"
import { AreaLayout } from "@/components/templates/AreaLayout"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
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
  errorComponent: AreaErrorPage,
  component: OrganizerLayout,
})

function OrganizerLayout() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t("area.organizer")} />
      <AreaLayout
        width="wide"
        nav={
          <>
            <NavLink
              to={ROUTES.organizer.dashboard}
              activeOptions={{ exact: true }}
            >
              {t("nav.overview")}
            </NavLink>
            <NavLink to={ROUTES.organizer.events}>{t("nav.events")}</NavLink>
          </>
        }
        userMenu={<HeaderMenu />}
      >
        <Outlet />
      </AreaLayout>
    </>
  )
}
