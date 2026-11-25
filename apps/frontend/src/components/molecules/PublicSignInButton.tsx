import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

/** The sign-in entry of a public header: the quiet button next to the language and theme switchers. */
export function PublicSignInButton() {
  const { t } = useTranslation("common")

  return (
    <Button
      asChild
      variant="ghost"
    >
      <Link to={ROUTES.participant.login}>{t("publicHeader.signIn")}</Link>
    </Button>
  )
}
