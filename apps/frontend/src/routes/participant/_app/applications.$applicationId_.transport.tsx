import { createFileRoute } from "@tanstack/react-router"

import { ApplicationDetail } from "@/features/participant/components/ApplicationDetail"
import { ApplicationTransport } from "@/features/transport/components/ApplicationTransport"

export const Route = createFileRoute("/participant/_app/applications/$applicationId_/transport")({
  component: ApplicationTransportPage,
})

function ApplicationTransportPage() {
  const { applicationId } = Route.useParams()
  return (
    <>
      <ApplicationDetail applicationId={applicationId} />
      <ApplicationTransport applicationId={applicationId} />
    </>
  )
}
