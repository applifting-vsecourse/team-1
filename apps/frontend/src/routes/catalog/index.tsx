import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"

import { CatalogPage } from "@/features/catalog/components/CatalogPage"

const searchSchema = z.object({
  organization: z.string().optional(),
})

export const Route = createFileRoute("/catalog/")({
  validateSearch: searchSchema,
  component: CatalogRoute,
})

// US-123: public catalog of published events; the organization is a filter in the URL.
function CatalogRoute() {
  const { t } = useTranslation("catalog")
  const { organization } = Route.useSearch()
  const navigate = useNavigate()

  return (
    <>
      <Seo title={t("list.title")} />
      <PublicLayout isFullWidth>
        <div className="mx-auto w-full max-w-275 px-4 py-8 md:p-12">
          <CatalogPage
            organizationId={organization}
            onOrganizationChange={(organizationId) =>
              void navigate({
                to: ROUTES.catalog,
                search: { organization: organizationId },
                replace: true,
              })
            }
          />
        </div>
      </PublicLayout>
    </>
  )
}
