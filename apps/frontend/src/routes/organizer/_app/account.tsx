import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { AccountPage } from "@/features/auth/components/AccountPage"

export const Route = createFileRoute("/organizer/_app/account")({
  component: OrganizerAccountPage,
})

// US-02 (O30): who is signed in, and sign out.
function OrganizerAccountPage() {
  const { t } = useTranslation("auth")

  return (
    <>
      <Seo title={t("account.title")} />
      <AccountPage />
    </>
  )
}
