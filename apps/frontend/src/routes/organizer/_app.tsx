import { useQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useMatchRoute,
  useParams,
} from "@tanstack/react-router"
import { Calendar, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { SidebarLink } from "@/components/atoms/SidebarLink"
import { AreaLayout } from "@/components/templates/AreaLayout"
import { Button } from "@/components/ui/button"

import {
  myOnboardingOrganizationsQueryOptions,
  organizationProfileQueryOptions,
} from "@/features/auth/api/organizationOnboarding"
import { OrganizerAreaError } from "@/features/auth/components/OrganizerAreaError"
import { SidebarAccount } from "@/features/auth/components/SidebarAccount"
import { requireAccount } from "@/features/auth/lib/require-account"
import { eventQueryOptions } from "@/features/events/api/events"
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
  const { t: tEvents } = useTranslation("events")
  const context = usePageContext()

  return (
    <>
      <Seo title={t("area.organizer")} />
      <AreaLayout
        width="wide"
        logoTo={ROUTES.organizer.events}
        roleLabel={t("accountRole.ORGANIZER")}
        context={context}
        nav={
          <>
            {/* Temporarily without the "Přehled" item (#394): it only redirected to the last event and lit up
                before "Akce". Bring it back in a later sprint. */}
            {/* Figma v2: US-10 Akce · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15376-2 */}
            <SidebarLink
              to={ROUTES.organizer.events}
              icon={Calendar}
            >
              {t("nav.events")}
            </SidebarLink>
            <Button
              asChild
              variant="ghost"
              className="min-h-12 justify-start gap-4 px-3 text-base font-normal"
            >
              <Link to={ROUTES.organizer.newEvent}>
                <Plus
                  aria-hidden
                  className="size-5"
                />
                {tEvents("list.create")}
              </Link>
            </Button>
          </>
        }
        account={<SidebarAccount />}
        notifications={<NotificationCenter area="organizer" />}
      >
        <Outlet />
      </AreaLayout>
    </>
  )
}

/**
 * What the desktop top bar names: "<organization> / <event>" on an event's pages, "Akce" on the
 * events list; elsewhere the role label stays.
 */
function usePageContext(): string | undefined {
  const { t } = useTranslation("events")
  const matchRoute = useMatchRoute()
  const { eventId } = useParams({ strict: false })
  const { data: event } = useQuery({
    ...eventQueryOptions(eventId ?? ""),
    enabled: Boolean(eventId),
  })

  if (eventId) return event ? `${event.organizationName} / ${event.name}` : undefined
  if (matchRoute({ to: ROUTES.organizer.events })) return t("list.title")
  return undefined
}
