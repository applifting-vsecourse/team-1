import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiErrorCode } from "@/lib/api-client"

import { saveRoom, type EventRooms, type Room } from "@/features/events/api/rooms"

// Figma (Design system): X19 / X20 / X22 / X23, X19a / X22a · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12370-121
// Shared-room variant · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12370-767
export function RoomDialog({
  event,
  room,
  onClose,
  onSaved,
  onDelete,
}: {
  event: EventRooms
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
        event.eventId,
        {
          name: values.name,
          capacity: Number(values.capacity),
          gender: event.roomMode === "GENDERED" ? values.gender : null,
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-170">
        <p className="text-xs font-medium text-muted-foreground uppercase">{event.eventName}</p>
        <div className="flex items-center justify-between gap-4 pr-8">
          <DialogTitle>{t(room ? "rooms.edit" : "rooms.add")}</DialogTitle>
        </div>
        <DialogDescription className="text-base">
          {t(
            event.roomMode === "GENDERED" ? "rooms.genderedDescription" : "rooms.sharedDescription",
          )}
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
                    <FormDescription className="text-xs">{t("rooms.nameHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("rooms.capacityLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                      />
                    </FormControl>
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
              {event.roomMode === "GENDERED" ? (
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
                      <FormDescription className="text-xs">{t("rooms.genderHint")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </fieldset>
            <p className="text-xs text-muted-foreground">{t("rooms.required")}</p>
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
