import { createFileRoute } from "@tanstack/react-router"

import { BoardPage } from "@/features/board/components/BoardPage"

export const Route = createFileRoute("/participant/_app/board")({
  component: () => <BoardPage />,
})
