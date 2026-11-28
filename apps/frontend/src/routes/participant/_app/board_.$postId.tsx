import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { BoardPage } from "@/features/board/components/BoardPage"

export const Route = createFileRoute("/participant/_app/board_/$postId")({
  validateSearch: z.object({ applicationId: z.string().optional() }),
  component: BoardPostPage,
})

function BoardPostPage() {
  const { postId } = Route.useParams()
  const { applicationId } = Route.useSearch()
  return (
    <BoardPage
      postId={postId}
      applicationId={applicationId}
    />
  )
}
