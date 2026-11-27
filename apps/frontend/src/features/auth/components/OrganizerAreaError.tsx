import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { AreaErrorPage } from "@/components/pages/AreaErrorPage"
import { ForbiddenPage } from "@/components/pages/ForbiddenPage"
import { Button } from "@/components/ui/button"
import { ForbiddenError } from "@/lib/errors"

import { useSession } from "@/features/auth/hooks/useSession"
import { useSignOut } from "@/features/auth/hooks/useSignOut"

/**
 * `errorComponent` of the organizer area. A signed-in participant gets the 403 with a way to
 * their applications and a way to sign in with another account; an organizer opening another
 * organization's record gets the 403 with the way to their events; everything else falls back
 * to the shared area error page.
 */
// Figma: S16 Cizí záznam · 403 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18602-22496
export function OrganizerAreaError({ error }: { error: unknown }) {
  const { t } = useTranslation("auth")
  const { t: tCommon } = useTranslation()
  const { user } = useSession()
  // „Přihlásit se jiným účtem“: sign out, then straight to the sign-in.
  const signOut = useSignOut({ to: ROUTES.participant.login })

  if (!(error instanceof ForbiddenError) || !user) {
    return <AreaErrorPage error={error} />
  }

  if (user.accountType === "ORGANIZER") return <ForbiddenPage />

  if (user.accountType !== "PARTICIPANT") return <AreaErrorPage error={error} />

  return (
    <ForbiddenPage
      back={{ to: ROUTES.participant.applications, label: tCommon("pages.actions.applications") }}
      accountAction={
        <Button
          variant="ghost"
          size="lg"
          className="w-full"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          {t("forbiddenForParticipant.switchAccount")}
        </Button>
      }
    />
  )
}
