import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Seo } from "@/components/atoms/Seo"

import { AccountPage } from "@/features/auth/components/AccountPage"

export const Route = createFileRoute("/organizer/_app/account")({
  validateSearch: z.object({ emailChanged: z.boolean().optional() }),
  component: OrganizerAccountPage,
})

// US-124 (O30): name, language and password of the signed-in account.
function OrganizerAccountPage() {
  const { t } = useTranslation("auth")
  const { emailChanged: isEmailChanged } = Route.useSearch()

  return (
    <>
      <Seo title={t("account.title")} />
      <AccountPage isEmailChanged={isEmailChanged === true} />
    </>
  )
}
