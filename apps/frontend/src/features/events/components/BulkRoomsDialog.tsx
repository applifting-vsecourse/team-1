import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { PendingButton } from "@/components/atoms/PendingButton"
import { ErrorState } from "@/components/molecules/ErrorState"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
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
import { notify } from "@/lib/notify"

import { createRoomsBulk, type BulkRoomsResult, type TermRooms } from "@/features/events/api/rooms"
import { BULK_MAX_NUMBER, BULK_ROOMS_MAX, formatNumbers } from "@/features/events/lib/bulk-rooms"

const toInt = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : Number.NaN)
const inRange = (value: string, min: number, max: number) => {
  const number = toInt(value)
  return number >= min && number <= max
}
/** A blank count of a gendered term means none. */
const toCount = (value: string) => (value.trim() === "" ? 0 : toInt(value))

/** The next free number after the numeric room names the term already has. */
export function nextRoomNumber(rooms: { name: string }[]): number {
  const numbers = rooms.filter((room) => /^\d+$/.test(room.name)).map((room) => Number(room.name))
  return Math.min(Math.max(0, ...numbers) + 1, BULK_MAX_NUMBER)
}

// Several identical rooms at once: how many (per gender in a gendered term), beds per room and the first number; the preview is counted here before saving.
// No Figma frame exists for this story; built from DESIGN.md and the room dialogs of US-14.
export function BulkRoomsDialog({
  term,
  onClose,
  onSaved,
}: {
  term: TermRooms
  onClose: () => void
  /** Called after the rooms were created, so the list can refresh. */
  onSaved: () => Promise<void>
}) {
  const { t } = useTranslation("events")
  const isGendered = term.roomMode === "GENDERED"
  const schema = z
    .object({
      count: z.string(),
      countFemale: z.string(),
      countMale: z.string(),
      capacity: z
        .string()
        .refine((value) => /^\d+$/.test(value) && Number(value) >= 1, t("rooms.capacityError")),
      firstNumber: z.string(),
    })
    .superRefine((values, ctx) => {
      const issue = (path: string, message: string) =>
        ctx.addIssue({ code: "custom", path: [path], message })
      let total: number
      if (isGendered) {
        for (const name of ["countFemale", "countMale"] as const) {
          const value = values[name].trim()
          if (value !== "" && !inRange(value, 0, BULK_ROOMS_MAX)) {
            issue(name, t("rooms.bulk.countGenderError", { max: BULK_ROOMS_MAX }))
          }
        }
        total = toCount(values.countFemale) + toCount(values.countMale)
        if (total > BULK_ROOMS_MAX) {
          issue("countFemale", t("rooms.bulk.countSumMaxError", { max: BULK_ROOMS_MAX }))
        } else if (!(total >= 1)) {
          issue("countFemale", t("rooms.bulk.countSumError"))
        }
      } else {
        total = toInt(values.count)
        if (!inRange(values.count, 1, BULK_ROOMS_MAX)) {
          issue("count", t("rooms.bulk.countError", { max: BULK_ROOMS_MAX }))
        }
      }
      const first = toInt(values.firstNumber)
      if (!(first >= 1 && (Number.isNaN(total) || first + total - 1 <= BULK_MAX_NUMBER))) {
        issue("firstNumber", t("rooms.bulk.firstNumberError"))
      }
    })
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      count: "",
      countFemale: "",
      countMale: "",
      capacity: "",
      firstNumber: String(nextRoomNumber(term.rooms)),
    },
  })
  const summarize = (result: BulkRoomsResult) =>
    result.skipped.length
      ? t("rooms.bulk.createdSkipped", {
          rooms: t("rooms.roomCount", { count: result.created.length }),
          skipped: t("rooms.roomCount", { count: result.skipped.length }),
          names: formatNumbers(result.skipped),
        })
      : t("rooms.bulk.created", { rooms: t("rooms.roomCount", { count: result.created.length }) })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      createRoomsBulk(
        term.eventId,
        term.termId,
        isGendered
          ? {
              countFemale: toCount(values.countFemale),
              countMale: toCount(values.countMale),
              capacity: Number(values.capacity),
              firstNumber: Number(values.firstNumber),
            }
          : {
              count: toInt(values.count),
              capacity: Number(values.capacity),
              firstNumber: Number(values.firstNumber),
            },
      ),
  })
  const submit = form.handleSubmit(async (values) => {
    let result: BulkRoomsResult
    try {
      result = await mutation.mutateAsync(values)
    } catch {
      return
    }
    await onSaved()
    const notifyResult = result.skipped.length ? notify.warning : notify.success
    notifyResult(summarize(result))
    onClose()
  })
  const isPending = mutation.isPending || form.formState.isSubmitting
  const [count, countFemale, countMale, capacity, firstNumber] = useWatch({
    control: form.control,
    name: ["count", "countFemale", "countMale", "capacity", "firstNumber"],
  })
  const female = isGendered ? toCount(countFemale) : 0
  const male = isGendered ? toCount(countMale) : 0
  const total = isGendered ? female + male : toInt(count)
  const first = toInt(firstNumber)
  const isPreviewable =
    inRange(String(total), 1, BULK_ROOMS_MAX) &&
    inRange(capacity, 1, Number.MAX_SAFE_INTEGER) &&
    first >= 1 &&
    first + total - 1 <= BULK_MAX_NUMBER
  const range = (from: number, size: number) =>
    size === 1 ? String(from) : `${from}–${from + size - 1}`
  const counts = (size: number) => ({
    rooms: t("rooms.roomCount", { count: size }),
    beds: t("rooms.beds", { count: size * toInt(capacity) }),
  })
  const countFields = isGendered
    ? ([
        ["countFemale", "rooms.bulk.countFemale"],
        ["countMale", "rooms.bulk.countMale"],
      ] as const)
    : ([["count", "rooms.bulk.count"]] as const)
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onClose()
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-170"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t("rooms.bulk.title")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              void submit(e)
            }}
          >
            <fieldset
              disabled={isPending}
              className="flex flex-col gap-4"
            >
              {[
                ...countFields,
                ["capacity", "rooms.bulk.capacity"],
                ["firstNumber", "rooms.bulk.firstNumber"],
              ].map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name as keyof z.infer<typeof schema>}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t(label as "rooms.bulk.count")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          min={name.startsWith("count") && name !== "count" ? 0 : 1}
                          step={1}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </fieldset>
            {isPreviewable ? (
              <div
                className="flex flex-col gap-1 font-medium"
                aria-live="polite"
              >
                {isGendered ? (
                  <>
                    {female > 0 ? (
                      <p>
                        {t("rooms.bulk.previewGender", {
                          label: t("rooms.femaleRooms"),
                          ...counts(female),
                          range: range(first, female),
                        })}
                      </p>
                    ) : null}
                    {male > 0 ? (
                      <p>
                        {t("rooms.bulk.previewGender", {
                          label: t("rooms.maleRooms"),
                          ...counts(male),
                          range: range(first + female, male),
                        })}
                      </p>
                    ) : null}
                    <p>{t("rooms.bulk.previewTotal", counts(total))}</p>
                  </>
                ) : (
                  <p>
                    {t("rooms.bulk.previewShared", {
                      ...counts(total),
                      range: range(first, total),
                    })}
                  </p>
                )}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">{t("rooms.required")}</p>
            {mutation.isError ? (
              <ErrorState
                title={t("rooms.saveFailed")}
                error={mutation.error}
              />
            ) : null}
            <DialogFooter className="gap-4">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="sm:w-38"
                  disabled={isPending}
                >
                  {t("rooms.close")}
                </Button>
              </DialogClose>
              <PendingButton
                isPending={isPending}
                type="submit"
                size="lg"
                className="sm:w-auto"
              >
                {t("rooms.bulk.submit")}
              </PendingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
