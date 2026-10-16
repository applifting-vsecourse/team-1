import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { ErrorLayout } from "@/components/templates/ErrorLayout"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <ErrorLayout
      title="Stránka nenalezena"
      description="Stránka neexistuje, nebo byl odkaz zadán špatně."
      action={
        <Button asChild>
          <Link to={ROUTES.home}>Na úvodní stránku</Link>
        </Button>
      }
    />
  )
}
