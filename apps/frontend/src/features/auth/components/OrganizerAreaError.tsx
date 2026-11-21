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
// Figma: S16 Cizí záznam · 403 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18602-22496
export function OrganizerAreaError({ error }: { error: unknown }) {
  const { t } = useTranslation("auth")
  const { user } = useSession()
  const signOut = useSignOut()

  if (!(error instanceof ForbiddenError) || !user) {
    return <AreaErrorPage error={error} />
  }

  if (user.accountType === "ORGANIZER") {
    return (
      <ForbiddenPage
        description={t("forbiddenRecord.description")}
        back={{ to: ROUTES.organizer.events, label: t("forbiddenRecord.myEvents") }}
      />
    )
  }

  if (user.accountType !== "PARTICIPANT") return <AreaErrorPage error={error} />

  return (
    <ForbiddenPage
      title={t("forbiddenForParticipant.title")}
      description={t("forbiddenForParticipant.description")}
      back={{
        to: ROUTES.participant.applications,
        label: t("forbiddenForParticipant.myApplication"),
      }}
      accountAction={
        <Button
          variant="ghost"
          size="lg"
          className="h-12 w-full"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          {t("forbiddenForParticipant.signOutAndSwitch")}
        </Button>
      }
    />
  )
}
