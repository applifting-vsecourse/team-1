import { ErrorPage } from "@/components/pages/ErrorPage"
import { ForbiddenPage } from "@/components/pages/ForbiddenPage"
import { ForbiddenError } from "@/lib/errors"

type AreaErrorPageProps = {
  // TanStack Router types a route error as unknown: anything can be thrown.
  error: unknown
}

/** `errorComponent` of the signed-in area layouts: 403 page or generic error. */
export function AreaErrorPage({ error }: AreaErrorPageProps) {
  if (error instanceof ForbiddenError) return <ForbiddenPage />
  return <ErrorPage error={error} />
}
