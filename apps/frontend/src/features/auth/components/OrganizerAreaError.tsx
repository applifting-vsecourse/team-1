import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { AreaErrorPage } from "@/components/pages/AreaErrorPage"
import { ForbiddenPage } from "@/components/pages/ForbiddenPage"
import { Button } from "@/components/ui/button"
import { ForbiddenError } from "@/lib/errors"

import { useSession } from "@/features/auth/hooks/useSession"
import { useSignOut } from "@/features/auth/hooks/useSignOut"

/**
 * `errorComponent` of the organizer area. A signed-in participant gets the
 * tailored 403 (Figma S06, see ForbiddenPage) with a way back to their application; an organizer
 * opening another organization's record gets S16 with a way back to their events; everything
 * else falls back to the shared area error page.
 */
// Figma (Design system): S16 Cizí záznam · 403 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12117-180
export function OrganizerAreaError({ error }: { error: Error }) {
  const { t } = useTranslation("auth")
  const { user } = useSession()
  const signOut = useSignOut()

  if (!(error instanceof ForbiddenError) || !user) {
    return <AreaErrorPage error={error} />
  }

  if (user.accountType === "ORGANIZER") {
    return (
      <ForbiddenPage
        variant={{
          description: t("forbiddenRecord.description"),
          cardTitle: t("forbiddenRecord.cardTitle"),
          body: t("forbiddenRecord.body"),
          actions: (
            <Button
              asChild
              size="lg"
              className="w-full"
            >
              <Link to={ROUTES.organizer.events}>{t("forbiddenRecord.myEvents")}</Link>
            </Button>
          ),
        }}
      />
    )
  }

  if (user.accountType !== "PARTICIPANT") return <AreaErrorPage error={error} />

  return (
    <ForbiddenPage
      variant={{
        description: t("forbiddenForParticipant.description"),
        cardTitle: t("forbiddenForParticipant.cardTitle"),
        body: t("forbiddenForParticipant.body"),
        actions: (
          <>
            <Button
              asChild
              size="lg"
              className="w-full"
            >
              <Link to={ROUTES.participant.applications}>
                {t("forbiddenForParticipant.myApplication")}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              disabled={signOut.isPending}
              onClick={() => signOut.mutate()}
            >
              {t("forbiddenForParticipant.signOutAndSwitch")}
            </Button>
          </>
        ),
      }}
    />
  )
}
