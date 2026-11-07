import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { Calendar, LayoutGrid } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { SidebarLink } from "@/components/atoms/SidebarLink"
import { AreaLayout } from "@/components/templates/AreaLayout"

import {
  myOnboardingOrganizationsQueryOptions,
  organizationProfileQueryOptions,
} from "@/features/auth/api/organizationOnboarding"
import { OrganizerAreaError } from "@/features/auth/components/OrganizerAreaError"
import { SidebarAccount } from "@/features/auth/components/SidebarAccount"
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

  return (
    <>
      <Seo title={t("area.organizer")} />
      <AreaLayout
        width="wide"
        roleLabel={t("accountRole.ORGANIZER")}
        nav={
          <>
            {/* Figma (Design system): #51 Letní kemp Lipno 2027 / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19798-36893 */}
            <SidebarLink
              to={ROUTES.organizer.home}
              icon={LayoutGrid}
            >
              {t("nav.overview")}
            </SidebarLink>
            <SidebarLink
              to={ROUTES.organizer.events}
              icon={Calendar}
            >
              {t("nav.events")}
            </SidebarLink>
          </>
        }
        account={<SidebarAccount />}
      >
        <Outlet />
      </AreaLayout>
    </>
  )
}
