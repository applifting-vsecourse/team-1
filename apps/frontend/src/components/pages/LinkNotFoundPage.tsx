import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import Lost from "@/assets/illustrations/lost.svg?react"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { PublicSignInButton } from "@/components/molecules/PublicSignInButton"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Button } from "@/components/ui/button"

/** A public link (event page, application, confirmation) that points to nothing. */
// Figma (Design system v2): Odkaz nefunguje · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27426-16460 (mobile 27426-16493)
export function LinkNotFoundPage() {
  const { t } = useTranslation("common")

  return (
    <>
      <Seo title={t("pages.linkNotFound.title")} />
      <PublicLayout
        isFullWidth
        headerAction={<PublicSignInButton />}
      >
        <div className="mx-auto w-full max-w-102 px-4 py-12 md:py-20">
          <EmptyState
            titleAs="h1"
            title={t("pages.linkNotFound.title")}
            illustration={<Lost className="w-60" />}
            action={
              <Button
                asChild
                size="lg"
                className="w-full"
              >
                <Link to={ROUTES.catalog}>{t("pages.linkNotFound.action")}</Link>
              </Button>
            }
          />
        </div>
      </PublicLayout>
    </>
  )
}
