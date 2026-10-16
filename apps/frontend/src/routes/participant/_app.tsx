import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { NavLink } from "@/components/atoms/NavLink"
import { Seo } from "@/components/atoms/Seo"
import { AreaErrorPage } from "@/components/pages/AreaErrorPage"
import { AreaLayout } from "@/components/templates/AreaLayout"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { requireAccount } from "@/features/auth/lib/require-account"

// Every /participant/* page except login and set-password sits under this layout.
export const Route = createFileRoute("/participant/_app")({
  beforeLoad: async ({ context, location }) => {
    await requireAccount({
      queryClient: context.queryClient,
      location,
      loginRoute: ROUTES.participant.login,
      accountType: "PARTICIPANT",
    })
  },
  errorComponent: AreaErrorPage,
  component: ParticipantLayout,
})

function ParticipantLayout() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t("area.participant")} />
      <AreaLayout
        width="reading"
        nav={
          <>
            <NavLink
              to={ROUTES.participant.applications}
              activeOptions={{ exact: true }}
            >
              {t("nav.myApplication")}
            </NavLink>
            <NavLink to={ROUTES.participant.account}>{t("nav.account")}</NavLink>
          </>
        }
        userMenu={<HeaderMenu />}
      >
        <Outlet />
      </AreaLayout>
    </>
  )
}
