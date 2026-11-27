import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { ListSkeleton } from "@/components/molecules/ListSkeleton"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/date"

import { eventPostsQueryOptions, type OrganizerPostItem } from "@/features/board/api/board"
import { BoardPostDialog } from "@/features/board/components/BoardPostDialog"
import { DeleteBoardPostDialog } from "@/features/board/components/DeleteBoardPostDialog"
import { termsLabel } from "@/features/board/lib/post-label"

type Editor = { postId?: string }

/** The „Nástěnka“ tab of an event: the posts newest first, add, edit and delete. */
// Figma (Návrh #91 – Nástěnka): O1 detail akce · Nástěnka · Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29546-131700
export function BoardAdminPage({ eventId }: { eventId: string }) {
  const { t } = useTranslation("board")
  const query = useQuery(eventPostsQueryOptions(eventId))
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleting, setDeleting] = useState<OrganizerPostItem | null>(null)
  const posts = query.data

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("admin.title")} />
      <SectionHeader
        title={t("admin.title")}
        actions={
          <Button
            size="lg"
            onClick={() => {
              setEditor({})
            }}
          >
            {t("admin.new")}
          </Button>
        }
      />
      {query.isError ? (
        <ErrorState
          title={t("admin.loadFailed")}
          error={query.error}
          onRetry={() => {
            void query.refetch()
          }}
        />
      ) : !posts ? (
        <ListSkeleton />
      ) : posts.length === 0 ? (
        <EmptyState message={t("admin.empty")} />
      ) : (
        <div className="rounded-lg border border-border-strong bg-card">
          <Table className="min-w-160">
            <TableHeader className="bg-wash">
              <TableRow>
                <TableHead className="px-4">{t("admin.columns.title")}</TableHead>
                <TableHead className="w-40 px-4">{t("admin.columns.terms")}</TableHead>
                <TableHead className="w-30 px-4">{t("admin.columns.published")}</TableHead>
                <TableHead className="w-24 px-4">
                  <span className="sr-only">{t("admin.columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="px-4 py-1.5 font-medium whitespace-normal">
                    {post.title}
                  </TableCell>
                  <TableCell className="px-4 py-1.5 whitespace-normal">
                    {termsLabel(post.terms, post.eventTermCount, t)}
                  </TableCell>
                  <TableCell className="px-4 py-1.5 tabular-nums">
                    {formatDate(post.createdAt)}
                  </TableCell>
                  <TableCell className="px-4 py-1.5">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label={t("admin.edit")}
                        title={t("admin.edit")}
                        onClick={() => {
                          setEditor({ postId: post.id })
                        }}
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label={t("admin.delete")}
                        title={t("admin.delete")}
                        onClick={() => {
                          setDeleting(post)
                        }}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {editor ? (
        <BoardPostDialog
          key={editor.postId ?? "new"}
          eventId={eventId}
          postId={editor.postId}
          onClose={() => {
            setEditor(null)
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteBoardPostDialog
          eventId={eventId}
          post={deleting}
          onClose={() => {
            setDeleting(null)
          }}
        />
      ) : null}
    </div>
  )
}
