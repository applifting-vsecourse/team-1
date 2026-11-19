import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { createRoomsBulk, type TermRooms } from "@/features/events/api/rooms"

const MAX_COUNT = 200
const MAX_FIRST_NUMBER = 999_999

const toInt = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : Number.NaN)
const inRange = (value: string, min: number, max: number) => {
  const number = toInt(value)
  return number >= min && number <= max
}

/** The next free number after the numeric room names the term already has. */
export function nextRoomNumber(rooms: { name: string }[]): number {
  const numbers = rooms.filter((room) => /^\d+$/.test(room.name)).map((room) => Number(room.name))
  return Math.min(Math.max(0, ...numbers) + 1, MAX_FIRST_NUMBER)
}

// Several identical rooms at once: count, beds per room and the first number; the preview is counted here before saving.
// No Figma frame exists for this story; built from DESIGN.md and the room dialogs of US-14.
export function BulkRoomsDialog({
  term,
  onClose,
  onSaved,
}: {
  term: TermRooms
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = useTranslation("events")
  const isGendered = term.roomMode === "GENDERED"
  const schema = z.object({
    count: z.string().refine((value) => inRange(value, 1, MAX_COUNT), t("rooms.bulk.countError")),
    capacity: z
      .string()
      .refine((value) => /^\d+$/.test(value) && Number(value) >= 1, t("rooms.capacityError")),
    firstNumber: z
      .string()
      .refine((value) => inRange(value, 1, MAX_FIRST_NUMBER), t("rooms.bulk.firstNumberError")),
    gender: z.enum(["FEMALE", "MALE"]),
  })
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      count: "",
      capacity: "",
      firstNumber: String(nextRoomNumber(term.rooms)),
      gender: "FEMALE",
    },
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      createRoomsBulk(term.eventId, term.termId, {
        count: Number(values.count),
        capacity: Number(values.capacity),
        firstNumber: Number(values.firstNumber),
        ...(isGendered ? { gender: values.gender } : {}),
      }),
  })
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
    } catch {
      return
    }
    await onSaved()
    onClose()
  })
  const isPending = mutation.isPending || form.formState.isSubmitting
  const [count, capacity, firstNumber] = useWatch({
    control: form.control,
    name: ["count", "capacity", "firstNumber"],
  })
  const isPreviewable =
    inRange(count, 1, MAX_COUNT) &&
    inRange(capacity, 1, Number.MAX_SAFE_INTEGER) &&
    inRange(firstNumber, 1, MAX_FIRST_NUMBER)
  const last = toInt(firstNumber) + toInt(count) - 1
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
              {isGendered ? (
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("rooms.genderLabel")}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger
                            className="w-full"
                            ref={field.ref}
                            onBlur={field.onBlur}
                          >
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FEMALE">{t("rooms.female")}</SelectItem>
                          <SelectItem value="MALE">{t("rooms.male")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              {(
                [
                  ["count", "rooms.bulk.count", MAX_COUNT],
                  ["capacity", "rooms.bulk.capacity", undefined],
                  ["firstNumber", "rooms.bulk.firstNumber", MAX_FIRST_NUMBER],
                ] as const
              ).map(([name, label, max]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t(label)}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={max}
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
              <p
                className="font-medium"
                aria-live="polite"
              >
                {t("rooms.bulk.preview", {
                  rooms: t("rooms.roomCount", { count: toInt(count) }),
                  beds: t("rooms.beds", { count: toInt(count) * toInt(capacity) }),
                  range:
                    toInt(count) === 1
                      ? String(toInt(firstNumber))
                      : `${toInt(firstNumber)}–${last}`,
                })}
              </p>
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
              <Button
                type="submit"
                size="lg"
                className="sm:w-auto"
                disabled={isPending}
              >
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {t("rooms.bulk.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
