import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { ErrorLayout } from "@/components/templates/ErrorLayout"
import { Button } from "@/components/ui/button"

/** 403 — shows nothing of the record that was asked for (US-02, US-10). */
export function ForbiddenPage() {
  return (
    <ErrorLayout
      title="Sem nemáte přístup"
      description="Tato stránka patří jinému účtu nebo jiné organizaci."
      action={
        <Button asChild>
          <Link to={ROUTES.home}>Na úvodní stránku</Link>
        </Button>
      }
    />
  )
}
