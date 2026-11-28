import { Link, useRouterState } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { SystemPageLayout } from "@/components/templates/SystemPageLayout"
import { Button } from "@/components/ui/button"

/** Where a dead link leads on from: the area it was in, the catalog on public pages. */
function useWayOn() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname.startsWith("/organizer/")) {
    return { to: ROUTES.organizer.events, label: "pages.actions.events" } as const
  }
  if (pathname.startsWith("/participant/")) {
    return { to: ROUTES.participant.applications, label: "pages.actions.applications" } as const
  }
  return { to: ROUTES.catalog, label: "pages.actions.catalog" } as const
}

// Figma: Obecná 404 · desktop 20125:1914, mobil 20125:1941 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20125-1914
// Figma: 404 v administraci · desktop 27525:7237, mobil 27525:7386 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27525-7237
// Figma: US-12 neplatný odkaz na přihlášku · 15399:10068, mobil 15399:10090 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15399-10068
export function NotFoundPage() {
  const { t } = useTranslation()
  const wayOn = useWayOn()

  return (
    <SystemPageLayout
      illustration="lost"
      title={t("pages.notFound.title")}
    >
      <Button
        asChild
        size="lg"
        className="w-full"
      >
        <Link to={wayOn.to}>{t(wayOn.label)}</Link>
      </Button>
    </SystemPageLayout>
  )
}
