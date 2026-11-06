import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"

import { EditApplicationPage } from "@/features/participant/components/EditApplicationPage"

export const Route = createFileRoute("/participant/_app/applications/$applicationId/edit")({
  component: ApplicationEditRoute,
})

function ApplicationEditRoute() {
  const { applicationId } = Route.useParams()
  const { t } = useTranslation("participant")
  return (
    <>
      <Seo title={t("edit.title")} />
      <EditApplicationPage applicationId={applicationId} />
    </>
  )
}
