import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, notFound } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { LinkNotFoundPage } from "@/components/pages/LinkNotFoundPage"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { publicEventQueryOptions } from "@/features/application-form/api/publicEvent"
import { ApplicationFormContainer } from "@/features/application-form/components/ApplicationFormContainer"

export const Route = createFileRoute("/apply/$token")({
  // An unknown link — or an event that has no term or room yet — is a 404.
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(publicEventQueryOptions(params.token))
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 404) throw notFound()
      throw error
    }
  },
  notFoundComponent: LinkNotFoundPage,
  component: ApplicationFormPage,
})

// US-23. The price of the application and the saving come with US-40 / US-27.
// Figma (Design system): V07 .../?node-id=12666-2538 (desktop), M02 .../?node-id=12666-18727 (360 px).
function ApplicationFormPage() {
  const { token } = Route.useParams()
  const { t } = useTranslation(["applicationForm", "auth"])
  const { data: event } = useSuspenseQuery(publicEventQueryOptions(token))

  return (
    <>
      <Seo title={t("form.heading", { event: event.name })} />
      <PublicLayout
        isFullWidth
        headerContentClassName="min-h-[79px] md:min-h-[115px]"
        headerAction={
          <Button
            asChild
            variant="ghost"
          >
            <Link to={ROUTES.participant.login}>{t("auth:form.submit")}</Link>
          </Button>
        }
      >
        <div className="mx-auto w-full max-w-[1248px] px-4 py-4 md:p-12">
          <ApplicationFormContainer
            token={token}
            event={event}
          />
        </div>
      </PublicLayout>
    </>
  )
}
