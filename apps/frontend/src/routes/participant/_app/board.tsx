import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { BoardPage } from "@/features/board/components/BoardPage"

export const Route = createFileRoute("/participant/_app/board")({
  validateSearch: z.object({ applicationId: z.string().optional() }),
  component: ParticipantBoardPage,
})

function ParticipantBoardPage() {
  const { applicationId } = Route.useSearch()
  return <BoardPage applicationId={applicationId} />
}
