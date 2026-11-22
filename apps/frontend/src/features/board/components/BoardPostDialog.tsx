import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { PendingButton } from "@/components/atoms/PendingButton"
import { CheckboxRow } from "@/components/molecules/CheckboxRow"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { notify } from "@/lib/notify"
import { termLine } from "@/lib/term-label"

import {
  boardKeys,
  eventPostQueryOptions,
  eventTermsQueryOptions,
  savePost,
  type BoardTerm,
  type OrganizerPost,
  type PostInput,
} from "@/features/board/api/board"

const TITLE_MAX = 120
const BODY_MAX = 5000

/**
 * New post, or the edit of one (`postId`): title, text and the terms it is shown for, all of them
 * ticked at first. The edit is loaded first, so the form starts with what is saved.
 */
// Figma (Návrh #91 – Nástěnka): O2 dialog Nový příspěvek · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29547-1530
export function BoardPostDialog({
  eventId,
  postId,
  onClose,
}: {
  eventId: string
  postId?: string
  onClose: () => void
}) {
  const { t } = useTranslation("board")
  const terms = useQuery(eventTermsQueryOptions(eventId))
  const post = useQuery({
    ...eventPostQueryOptions(eventId, postId ?? ""),
    enabled: Boolean(postId),
  })
  const failed = terms.error ?? post.error

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto bg-card p-4 shadow-md sm:max-w-148 sm:p-6">
        <DialogTitle className="pr-8 text-2xl">
          {t(postId ? "dialog.editTitle" : "dialog.newTitle")}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t(postId ? "dialog.editTitle" : "dialog.newTitle")}
        </DialogDescription>
        {failed ? (
          <ErrorState
            title={t("dialog.loadFailed")}
            error={failed}
            onRetry={() => {
              void terms.refetch()
              if (postId) void post.refetch()
            }}
          />
        ) : !terms.data || (postId && !post.data) ? (
          <LoadingState />
        ) : (
          <PostForm
            eventId={eventId}
            terms={terms.data}
            post={post.data}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PostForm({
  eventId,
  terms,
  post,
  onClose,
}: {
  eventId: string
  terms: BoardTerm[]
  post?: OrganizerPost
  onClose: () => void
}) {
  const { t } = useTranslation("board")
  const client = useQueryClient()
  const schema = z.object({
    title: z.string().trim().min(1, t("dialog.titleRequired")).max(TITLE_MAX, t("dialog.tooLong")),
    body: z.string().trim().min(1, t("dialog.bodyRequired")).max(BODY_MAX, t("dialog.tooLong")),
    termIds: z.array(z.string()).min(1, t("dialog.termsRequired")),
  })
  const form = useForm<PostInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: post?.title ?? "",
      body: post?.body ?? "",
      // A term the post had and the event has since cancelled is no longer offered.
      termIds: post
        ? post.terms.map((term) => term.id).filter((id) => terms.some((term) => term.id === id))
        : terms.map((term) => term.id),
    },
  })
  const mutation = useMutation({
    mutationFn: (values: PostInput) => savePost(eventId, values, post?.id),
    onSuccess: () => client.invalidateQueries({ queryKey: boardKeys.all }),
  })
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
    } catch {
      return
    }
    notify.success(t(post ? "dialog.saved" : "dialog.added"))
    onClose()
  })
  const isPending = mutation.isPending || form.formState.isSubmitting

  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          void submit(event)
        }}
      >
        <fieldset
          disabled={isPending}
          className="flex min-w-0 flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("dialog.titleLabel")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={TITLE_MAX}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("dialog.bodyLabel")}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={6}
                    maxLength={BODY_MAX}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="termIds"
            render={({ field }) => (
              <FormItem>
                <fieldset className="flex flex-col">
                  <legend className="mb-2 text-sm leading-5 font-medium">
                    {t("dialog.termsLabel")}
                  </legend>
                  {terms.map((term) => (
                    <CheckboxRow
                      key={term.id}
                      id={`board-term-${term.id}`}
                      label={termLine(term)}
                      checked={field.value.includes(term.id)}
                      onCheckedChange={(isChecked) => {
                        field.onChange(
                          isChecked
                            ? [...field.value, term.id]
                            : field.value.filter((id) => id !== term.id),
                        )
                      }}
                    />
                  ))}
                </fieldset>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>
        {mutation.isError ? (
          <ErrorState
            title={t("dialog.saveFailed")}
            error={mutation.error}
          />
        ) : null}
        <DialogFooter className="gap-2 max-sm:flex-col-reverse sm:items-center sm:justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isPending}
            >
              {t("dialog.cancel")}
            </Button>
          </DialogClose>
          <PendingButton
            isPending={isPending}
            type="submit"
            size="lg"
          >
            {t(post ? "dialog.save" : "dialog.add")}
          </PendingButton>
        </DialogFooter>
      </form>
    </Form>
  )
}
