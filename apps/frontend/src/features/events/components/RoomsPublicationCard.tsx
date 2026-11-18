import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { notify } from "@/lib/notify"

import { setRoomsPublished, type TermRooms } from "@/features/events/api/rooms"

/** One switch per term: confirmed participants see their room and roommates only after it is on (US-144). */
// Figma (Design system): US-144 Organizátor · výchozí vypnuté zveřejnění · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=24910-2958 (mobile 24910-3073)
export function RoomsPublicationCard({
  term,
  onChanged,
}: {
  term: TermRooms
  onChanged: () => Promise<void>
}) {
  const { t } = useTranslation("events")
  const mutation = useMutation({
    mutationFn: (isPublished: boolean) => setRoomsPublished(term.eventId, term.termId, isPublished),
    onSuccess: onChanged,
    onError: () => notify.error(t("roomsPublication.failed")),
  })
  return (
    <Card className="mx-auto w-full gap-3 p-4 sm:max-w-190">
      <h3 className="text-xl font-semibold">{t("roomsPublication.title")}</h3>
      <div className="flex items-center gap-3 py-2">
        <Switch
          id="rooms-published"
          checked={term.roomsPublished}
          disabled={mutation.isPending}
          onCheckedChange={(isChecked) => mutation.mutate(isChecked)}
        />
        <Label
          htmlFor="rooms-published"
          className="text-base font-normal"
        >
          {t("roomsPublication.switch")}
        </Label>
      </div>
      {term.roomsPublished ? null : (
        <p className="text-sm text-muted-foreground">{t("roomsPublication.hintOff")}</p>
      )}
    </Card>
  )
}
