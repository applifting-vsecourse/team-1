import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { AccountPage } from "@/features/auth/components/AccountPage"

export const Route = createFileRoute("/participant/_app/account")({
  component: ParticipantAccountPage,
})

// US-02 (U13): who is signed in, and sign out.
function ParticipantAccountPage() {
  const { t } = useTranslation("auth")

  return (
    <>
      <Seo title={t("account.title")} />
      <AccountPage />
    </>
  )
}
