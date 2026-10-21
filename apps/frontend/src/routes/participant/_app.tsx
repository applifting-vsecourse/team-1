import { createFileRoute, Outlet } from "@tanstack/react-router"
import { ClipboardList } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { SidebarLink } from "@/components/atoms/SidebarLink"
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
        width="wide"
        roleLabel={t("accountRole.PARTICIPANT")}
        nav={
          <SidebarLink
            to={ROUTES.participant.applications}
            activeOptions={{ exact: true }}
            icon={ClipboardList}
          >
            {t("nav.applications")}
          </SidebarLink>
        }
        userMenu={<HeaderMenu />}
      >
        <Outlet />
      </AreaLayout>
    </>
  )
}
