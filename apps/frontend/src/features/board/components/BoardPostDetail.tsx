import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/date"

import { boardKeys, boardPostQueryOptions, markPostRead } from "@/features/board/api/board"
import { termsLabel } from "@/features/board/lib/post-label"

/**
 * One post with its whole text. Opening it is what makes it no longer new: the account's read
 * mark and the notification of the post are written, then the list, the card and the bell refetch.
 */
// Figma (Návrh #91 – Nástěnka): C1 seznam a detail · Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29544-1216
// Figma (Návrh #91 – Nástěnka): C3 detail · Mobil 360 px · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29545-32592
export function BoardPostDetail({ postId }: { postId: string }) {
  const { t } = useTranslation("board")
  const client = useQueryClient()
  const query = useQuery(boardPostQueryOptions(postId))
  const read = useMutation({
    mutationFn: markPostRead,
    onSuccess: async () => {
      // The bell lives in features/notifications, which a feature does not import: its key by name.
      await Promise.all([
        client.invalidateQueries({ queryKey: boardKeys.all }),
        client.invalidateQueries({ queryKey: ["notifications"] }),
      ])
    },
  })
  const isNew = query.data?.isNew === true
  const { mutate } = read
  useEffect(() => {
    if (isNew) mutate(postId)
  }, [isNew, mutate, postId])

  if (query.isError) {
    return (
      <ErrorState
        title={t("loadFailed")}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  }
  if (!query.data) return <LoadingState />
  const post = query.data
  return (
    <Card className="min-w-0 gap-3 p-6">
      <p className="text-sm text-muted-foreground">
        {formatDate(post.createdAt)} · {termsLabel(post.terms, post.eventTermCount, t)}
      </p>
      <h2 className="text-2xl font-bold break-words">{post.title}</h2>
      <p className="break-words whitespace-pre-line">{post.body}</p>
    </Card>
  )
}
