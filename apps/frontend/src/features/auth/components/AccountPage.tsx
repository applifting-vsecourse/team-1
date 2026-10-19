import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/molecules/PageHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { useSession } from "@/features/auth/hooks/useSession"
import { useSignOut } from "@/features/auth/hooks/useSignOut"

/**
 * Account settings: who is signed in, and sign out. The security and
 * notification sections of the frames come with their own stories.
 */
// Figma (Design system): O30 Nastavení účtu organizátora · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-176
// Figma (Design system): U13 Nastavení účtu účastníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-11146
export function AccountPage() {
  const { t } = useTranslation("auth")
  const { user } = useSession()
  const signOut = useSignOut()

  if (!user) return null

  return (
    <>
      <PageHeader
        title={t("account.title")}
        description={t(`account.description.${user.accountType}`)}
      />

      <Card className="max-w-196 gap-6 rounded-lg p-8">
        <h2 className="text-2xl font-bold tracking-tight">{t("account.yourAccount")}</h2>
        <div>
          <p>{user.name}</p>
          <p>{user.email}</p>
        </div>
        <p className="text-sm text-muted-foreground">{t(`account.kind.${user.accountType}`)}</p>
      </Card>

      <Card className="max-w-196 gap-6 rounded-lg p-8">
        <h2 className="text-2xl font-bold tracking-tight">{t("account.session")}</h2>
        <p>{t(`account.signOutHint.${user.accountType}`)}</p>
        <Button
          variant="outline"
          className="w-44"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          {t("menu.signOut")}
        </Button>
      </Card>
    </>
  )
}
