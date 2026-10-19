import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
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
 * tailored 403 (Figma S06, see ForbiddenPage) with a way back to their application; everything
 * else falls back to the shared area error page.
 */
export function OrganizerAreaError({ error }: { error: Error }) {
  const { t } = useTranslation("auth")
  const { user } = useSession()
  const signOut = useSignOut()

  if (!(error instanceof ForbiddenError) || user?.accountType !== "PARTICIPANT") {
    return <AreaErrorPage error={error} />
  }

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
              size="xl"
              className="w-full"
            >
              <Link to={ROUTES.participant.applications}>
                {t("forbiddenForParticipant.myApplication")}
                <ArrowRight />
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
