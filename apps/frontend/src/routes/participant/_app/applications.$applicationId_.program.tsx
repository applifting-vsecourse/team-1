import { createFileRoute } from "@tanstack/react-router"

import { ParticipantProgram } from "@/features/program/components/ParticipantProgram"

export const Route = createFileRoute("/participant/_app/applications/$applicationId_/program")({
  component: ParticipantProgramPage,
})

// US-66: the program of the terms the participant is confirmed in.
function ParticipantProgramPage() {
  const { applicationId } = Route.useParams()
  return <ParticipantProgram applicationId={applicationId} />
}
