import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { Calendar } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { SidebarLink } from "@/components/atoms/SidebarLink"
import { AreaLayout } from "@/components/templates/AreaLayout"

import {
  myOnboardingOrganizationsQueryOptions,
  organizationProfileQueryOptions,
} from "@/features/auth/api/organizationOnboarding"
import { AccountMenu, type AccountMenuItem } from "@/features/auth/components/AccountMenu"
import { OrganizerAreaError } from "@/features/auth/components/OrganizerAreaError"
import { SidebarAccount } from "@/features/auth/components/SidebarAccount"
import { requireAccount } from "@/features/auth/lib/require-account"
import { NotificationCenter } from "@/features/notifications/components/NotificationCenter"

// Every /organizer/* page except the login sits under this layout.
export const Route = createFileRoute("/organizer/_app")({
  beforeLoad: async ({ context, location }) => {
    await requireAccount({
      queryClient: context.queryClient,
      location,
      loginRoute: ROUTES.organizer.login,
      accountType: "ORGANIZER",
    })
    const organizations = await context.queryClient.ensureQueryData(
      myOnboardingOrganizationsQueryOptions(),
    )
    const first = organizations[0]
    if (!first) throw redirect({ to: ROUTES.organizer.onboarding })
    const profile = await context.queryClient.ensureQueryData(
      organizationProfileQueryOptions(first.id),
    )
    if (!profile.bankAccount) throw redirect({ to: ROUTES.organizer.onboarding })
  },
  errorComponent: OrganizerAreaError,
  component: OrganizerLayout,
})

function OrganizerLayout() {
  const { t } = useTranslation()
  // Figma F5: the sidebar has only „Akce“; creating an event is the page's primary button, and the
  // „Přehled“ item stays out (#394). „Akce“ stays marked on an event's pages.
  const nav: AccountMenuItem[] = [
    { to: ROUTES.organizer.events, icon: Calendar, label: t("nav.events") },
  ]

  return (
    <>
      <Seo title={t("area.organizer")} />
      <AreaLayout
        width="wide"
        logoTo={ROUTES.organizer.events}
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
            subtitle={t("accountRole.ORGANIZER")}
            hasPreferences={false}
          />
        }
        mobileMenu={<AccountMenu items={nav} />}
        notifications={<NotificationCenter area="organizer" />}
      >
        <Outlet />
      </AreaLayout>
    </>
  )
}
