import { ErrorPage } from "@/components/pages/ErrorPage"
import { ForbiddenPage } from "@/components/pages/ForbiddenPage"
import { ForbiddenError } from "@/lib/errors"

type AreaErrorPageProps = {
  error: Error
}

/** `errorComponent` of the signed-in area layouts: 403 page or generic error. */
export function AreaErrorPage({ error }: AreaErrorPageProps) {
  if (error instanceof ForbiddenError) return <ForbiddenPage />
  return <ErrorPage error={error} />
}
