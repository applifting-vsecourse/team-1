import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ErrorState } from "@/components/molecules/ErrorState"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { notify } from "@/lib/notify"
import { termDates, termTitle } from "@/lib/term-label"

import {
  programKeys,
  saveProgramBlock,
  type ProgramBlock,
  type ProgramBlockInput,
  type TermProgram,
} from "@/features/program/api/program"
import { TimeSelect } from "@/features/program/components/TimeSelect"
import { toMinutes } from "@/features/program/lib/calendar"
import { daysOfTerm, formatDay } from "@/features/program/lib/days"

type Values = ProgramBlockInput

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** A new block starts at 9:00 and lasts an hour; the minutes stay on `00` until changed. */
const DEFAULT_START = "09:00"
const DEFAULT_END = "10:00"

/** One hour after `time`, kept within the day. */
function hourAfter(time: string): string {
  const minutes = Math.min(toMinutes(time) + 60, 23 * 60 + 55)
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

// Add or edit a block of the program of a term: day (only the days of the term), time from–to, name
// (required), place and description. A change shows to the participants at once.
// Design: Figma (Design system) US-66 · X25 Přidat blok / X25a Upravit blok / X25b Chyby u polí /
// X25c Den mimo termín · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23264-91877
export function ProgramBlockDialog({
  eventId,
  term,
  block,
  defaultDate,
  onDelete,
  onClose,
}: {
  eventId: string
  term: TermProgram
  /** Present when editing. */
  block?: ProgramBlock
  /** The day a new block starts on. */
  defaultDate: string
  /** Offered when editing: deleting the block from its dialog. */
  onDelete?: () => void
  onClose: () => void
}) {
  const { t } = useTranslation("program")
  const client = useQueryClient()
  const days = daysOfTerm(term)
  // A block that kept a day the term no longer has stays selectable, so the error can be shown.
  const options = block && !days.includes(block.date) ? [block.date, ...days] : days
  const schema = z
    .object({
      date: z.string(),
      startTime: z.string().regex(TIME, t("timeInvalid")),
      endTime: z.string().regex(TIME, t("timeInvalid")),
      name: z.string().trim().min(1, t("nameRequired")).max(100, t("tooLong")),
      place: z.string().trim().max(200, t("tooLong")),
      description: z.string().trim().max(2000, t("tooLong")),
    })
    .superRefine((values, context) => {
      if (!days.includes(values.date)) {
        context.addIssue({
          code: "custom",
          path: ["date"],
          message: t("dayOutsideTerm", { dates: termDates(term) }),
        })
      }
      if (
        TIME.test(values.startTime) &&
        TIME.test(values.endTime) &&
        values.endTime <= values.startTime
      ) {
        context.addIssue({ code: "custom", path: ["endTime"], message: t("endBeforeStart") })
      }
    })
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: block?.date ?? defaultDate,
      startTime: block?.startTime ?? DEFAULT_START,
      endTime: block?.endTime ?? DEFAULT_END,
      name: block?.name ?? "",
      place: block?.place ?? "",
      description: block?.description ?? "",
    },
  })
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      saveProgramBlock(eventId, values, block ? { id: block.id } : { termId: term.termId }),
    onSuccess: () => client.invalidateQueries({ queryKey: programKeys.event(eventId) }),
  })
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
    } catch {
      return
    }
    notify.success(t("saved"), t("savedDescription"))
    onClose()
  })
  const isPending = mutation.isPending || form.formState.isSubmitting
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-140">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          {termTitle({ ...term, name: term.termName })}
        </p>
        <DialogTitle className="pr-8">{t(block ? "editTitle" : "addTitle")}</DialogTitle>
        <DialogDescription>{t(block ? "hintEdit" : "hintAdd")}</DialogDescription>
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
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dayLabel")} *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options.map((day) => (
                          <SelectItem
                            key={day}
                            value={day}
                          >
                            {formatDay(day)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 items-start gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("startLabel")} *</FormLabel>
                      <FormControl>
                        <TimeSelect
                          value={field.value}
                          onChange={(time) => {
                            field.onChange(time)
                            if (form.getValues("endTime") <= time) {
                              form.setValue("endTime", hourAfter(time))
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("endLabel")} *</FormLabel>
                      <FormControl>
                        <TimeSelect
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nameLabel")} *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={100}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="place"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("placeLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={200}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("descriptionLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        maxLength={2000}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
            <p className="text-xs text-muted-foreground">* {t("required")}</p>
            {mutation.isError ? (
              <ErrorState
                title={t("saveFailed")}
                error={mutation.error}
              />
            ) : null}
            <DialogFooter className="gap-4 max-sm:flex-col-reverse sm:items-center">
              {onDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
                  disabled={isPending}
                  onClick={onDelete}
                >
                  <Trash2 />
                  {t("delete")}
                </Button>
              ) : null}
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={isPending}
                >
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="lg"
                disabled={isPending}
              >
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {t(block ? "save" : "add")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
