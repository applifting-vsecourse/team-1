import { createFileRoute, Outlet } from "@tanstack/react-router"
import { LayoutGrid, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { SidebarLink } from "@/components/atoms/SidebarLink"
import { AreaErrorPage } from "@/components/pages/AreaErrorPage"
import { AreaLayout } from "@/components/templates/AreaLayout"

import { AccountMenu, type AccountMenuItem } from "@/features/auth/components/AccountMenu"
import { SidebarAccount } from "@/features/auth/components/SidebarAccount"
import { requireAccount } from "@/features/auth/lib/require-account"
import { NotificationCenter } from "@/features/notifications/components/NotificationCenter"
import { ChangeRequestNotifications } from "@/features/participant/components/ChangeRequestNotifications"

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
  // Figma F4: Moje přihlášky first, then the public catalog (the sidebar and the mobile account menu).
  const nav: AccountMenuItem[] = [
    {
      to: ROUTES.participant.applications,
      activeOptions: { exact: true },
      icon: Users,
      label: t("nav.myApplications"),
    },
    { to: ROUTES.catalog, icon: LayoutGrid, label: t("nav.catalog") },
  ]

  return (
    <>
      <Seo title={t("area.participant")} />
      <AreaLayout
        width="reading"
        roleLabel={t("accountRole.PARTICIPANT")}
        nav={nav.map(({ label, ...link }) => (
          <SidebarLink
            key={label}
            {...link}
          >
            {label}
          </SidebarLink>
        ))}
        account={
          <SidebarAccount
            subtitle={t("nav.applicantRole")}
            hasPreferences={false}
          />
        }
        mobileMenu={<AccountMenu items={nav} />}
        notifications={
          <ChangeRequestNotifications>
            {(feed) => <NotificationCenter additionalFeed={feed} />}
          </ChangeRequestNotifications>
        }
      >
        <Outlet />
      </AreaLayout>
    </>
  )
}
