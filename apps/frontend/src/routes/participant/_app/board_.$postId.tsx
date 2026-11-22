import { createFileRoute } from "@tanstack/react-router"

import { BoardPage } from "@/features/board/components/BoardPage"

export const Route = createFileRoute("/participant/_app/board_/$postId")({
  component: BoardPostPage,
})

function BoardPostPage() {
  const { postId } = Route.useParams()
  return <BoardPage postId={postId} />
}
