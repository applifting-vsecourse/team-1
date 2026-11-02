import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2, Minus, Plus } from "lucide-react"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { apiErrorCode } from "@/lib/api-client"
import { formatDateRange } from "@/lib/date"

import { saveRoom, type Room, type TermRooms } from "@/features/events/api/rooms"

// Add and edit a room of one term.
// Figma (Design system): Přidání, úprava a smazání pokoje · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15434-1452
// Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15434-1560
export function RoomDialog({
  term,
  room,
  onClose,
  onSaved,
  onDelete,
}: {
  term: TermRooms
  room?: Room
  onClose: () => void
  onSaved: () => Promise<void>
  onDelete: (room: Room) => void
}) {
  const { t } = useTranslation("events")
  const schema = z.object({
    name: z.string().trim().min(1, t("rooms.nameRequired")).max(100, t("rooms.nameTooLong")),
    capacity: z
      .string()
      .refine((value) => /^\d+$/.test(value) && Number(value) >= 1, t("rooms.capacityError")),
    gender: z.enum(["FEMALE", "MALE"]),
  })
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: room?.name ?? "",
      capacity: room ? String(room.capacity) : "",
      gender: room?.gender ?? "FEMALE",
    },
  })
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      await saveRoom(
        term.eventId,
        term.termId,
        {
          name: values.name,
          capacity: Number(values.capacity),
          gender: term.roomMode === "GENDERED" ? values.gender : null,
        },
        room?.id,
      )
    },
  })
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
    } catch (error) {
      if (apiErrorCode(error) === "ROOM_NAME_TAKEN") {
        form.setError("name", { message: t("rooms.nameTaken") }, { shouldFocus: true })
      }
      return
    }
    await onSaved()
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-160">
        <div className="flex items-center justify-between gap-4 pr-8">
          <DialogTitle>{t(room ? "rooms.edit" : "rooms.add")}</DialogTitle>
        </div>
        <DialogDescription asChild>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">{t("rooms.inTerm")}</span>
            <span className="text-base text-foreground">
              {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
            </span>
          </div>
        </DialogDescription>
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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("rooms.nameLabel")}</FormLabel>
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
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("rooms.capacityField")}</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        aria-label={t("rooms.capacityDecrease")}
                        disabled={isPending}
                        onClick={() =>
                          field.onChange(String(Math.max(1, Number(field.value || 1) - 1)))
                        }
                      >
                        <Minus />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        aria-label={t("rooms.capacityIncrease")}
                        disabled={isPending}
                        onClick={() => field.onChange(String(Number(field.value || 0) + 1))}
                      >
                        <Plus />
                      </Button>
                    </div>
                    {form.formState.errors.capacity ? (
                      <FormMessage />
                    ) : (
                      <FormDescription className="text-xs">
                        {t("rooms.capacityHint")}
                      </FormDescription>
                    )}
                  </FormItem>
                )}
              />
              {term.roomMode === "GENDERED" ? (
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("rooms.genderLabel")}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isPending}
                          ref={field.ref}
                        >
                          {(["FEMALE", "MALE"] as const).map((gender) => (
                            <div
                              key={gender}
                              className="flex items-center gap-3"
                            >
                              <RadioGroupItem
                                id={`room-gender-${gender}`}
                                value={gender}
                              />
                              <Label htmlFor={`room-gender-${gender}`}>
                                {t(gender === "FEMALE" ? "rooms.female" : "rooms.male")}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </fieldset>
            {mutation.isError && apiErrorCode(mutation.error) !== "ROOM_NAME_TAKEN" ? (
              <ErrorState
                title={t("rooms.saveFailed")}
                error={mutation.error}
              />
            ) : null}
            <DialogFooter className="gap-4">
              {room ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  className="sm:mr-auto"
                  disabled={isPending}
                  onClick={() => onDelete(room)}
                >
                  {t("rooms.delete")}
                </Button>
              ) : null}
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="sm:w-38"
                  disabled={isPending}
                >
                  {t("rooms.cancel")}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="lg"
                className="sm:w-38"
                disabled={isPending}
              >
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {t(room ? "rooms.save" : "rooms.add")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
