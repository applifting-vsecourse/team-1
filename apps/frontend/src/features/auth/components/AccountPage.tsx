import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/molecules/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useSession } from "@/features/auth/hooks/useSession"
import { useSignOut } from "@/features/auth/hooks/useSignOut"

/** Account settings (Figma O30, U13): who is signed in, and sign out. */
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">{t("account.yourAccount")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>{user.name}</p>
          <p>{user.email}</p>
          <p className="mt-2 text-muted-foreground">{t(`account.kind.${user.accountType}`)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">{t("account.session")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4 text-sm">
          <p>{t(`account.signOutHint.${user.accountType}`)}</p>
          <Button
            variant="outline"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
          >
            {t("menu.signOut")}
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
