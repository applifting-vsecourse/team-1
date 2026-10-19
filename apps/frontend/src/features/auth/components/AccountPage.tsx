import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/molecules/PageHeader"
import { Badge } from "@/components/ui/badge"
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
// Figma (Remake): O30 Nastavení účtu organizátora · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=28-580
// Figma (Remake): U13 Nastavení účtu účastníka · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=28-698
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

      <Card className="gap-4 p-6">
        <h2 className="text-lg font-semibold">{t("account.yourAccount")}</h2>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Badge variant="secondary">{t(`account.kind.${user.accountType}`)}</Badge>
      </Card>

      <Card className="gap-4 p-6">
        <h2 className="text-lg font-semibold">{t("account.session")}</h2>
        <p className="text-muted-foreground">{t(`account.signOutHint.${user.accountType}`)}</p>
        <Button
          variant="outline"
          className="self-start"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          {t("menu.signOut")}
        </Button>
      </Card>
    </>
  )
}
