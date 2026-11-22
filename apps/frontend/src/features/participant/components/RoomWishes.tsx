import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { termLine } from "@/lib/term-label"

import { saveRoomWishes, type MyApplicationTerm } from "@/features/participant/api/applications"

const MAX_WISHES = 3
const MAX_NAME_LENGTH = 100

/** The roommate wishes of every confirmed term — the only terms the API sends them for (US-146). */
export function RoomWishesSection({
  applicationId,
  terms,
  editingTermId,
  onStartEditing,
  onStopEditing,
}: {
  applicationId: string
  terms: MyApplicationTerm[]
  editingTermId: string | null
  onStartEditing: (termId: string) => void
  onStopEditing: (termId: string) => void
}) {
  const withWishes = terms.filter((term) => term.roomWishes !== undefined)
  if (withWishes.length === 0) return null
  return (
    <>
      {withWishes.map((term) => (
        <RoomWishesCard
          key={JSON.stringify([term.termId, term.roomWishes, editingTermId === term.termId])}
          applicationId={applicationId}
          term={term}
          isEditing={editingTermId === term.termId}
          onStartEditing={() => onStartEditing(term.termId)}
          onStopEditing={() => onStopEditing(term.termId)}
        />
      ))}
    </>
  )
}

// Figma (Design system v2): #506 Přihlašovatel · Zadat přání · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-13607 (mobile 24910-13753)
// Figma (Design system v2): #506 Přihlašovatel · Upravit přání · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-13851 (mobile 24910-13997)
// Figma (Design system v2): #506 Přihlašovatel · Smazat přání · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=25131-31521 (mobile 24910-14223)
// Figma (Design system v2): #506 Přihlašovatel · Po smazání · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=25131-31665 (mobile 24910-14304)
function RoomWishesCard({
  applicationId,
  term,
  isEditing,
  onStartEditing,
  onStopEditing,
}: {
  applicationId: string
  term: MyApplicationTerm
  isEditing: boolean
  onStartEditing: () => void
  onStopEditing: () => void
}) {
  const { t } = useTranslation("participant")
  const client = useQueryClient()
  const saved = term.roomWishes ?? []
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [names, setNames] = useState<string[]>(() =>
    Array.from({ length: MAX_WISHES }, (_, index) => saved[index] ?? ""),
  )

  const mutation = useMutation({
    mutationFn: (next: string[]) => saveRoomWishes(applicationId, term.termId, next),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
      setIsConfirmingDelete(false)
      onStopEditing()
    },
  })

  const headingId = `room-wishes-${term.termId}`

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4"
    >
      <Card className="gap-4 p-4">
        <h2
          id={headingId}
          tabIndex={-1}
          className="text-xl font-bold tracking-tight"
        >
          {t("roomWishes.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{termLine(term)}</p>
        <Separator />
        {isEditing ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              mutation.mutate(names.map((name) => name.trim()).filter((name) => name !== ""))
            }}
          >
            <p className="text-sm text-muted-foreground">{t("roomWishes.hint")}</p>
            {names.map((name, index) => {
              const id = `${headingId}-${index}`
              return (
                <div
                  key={id}
                  className="flex flex-col gap-2"
                >
                  <Label htmlFor={id}>{t("roomWishes.nameLabel", { n: index + 1 })}</Label>
                  <Input
                    id={id}
                    value={name}
                    maxLength={MAX_NAME_LENGTH}
                    placeholder={t("roomWishes.placeholder")}
                    onChange={(event) =>
                      setNames(names.map((item, i) => (i === index ? event.target.value : item)))
                    }
                  />
                </div>
              )
            })}
            <div className="flex flex-wrap gap-3">
              <PendingButton
                isPending={mutation.isPending}
                type="submit"
                size="lg"
              >
                {t("roomWishes.save")}
              </PendingButton>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onStopEditing}
              >
                {t("roomWishes.cancel")}
              </Button>
            </div>
          </form>
        ) : isConfirmingDelete ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">{t("roomWishes.deleteTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("roomWishes.deleteBody")}</p>
            <div className="flex flex-wrap gap-3">
              <PendingButton
                isPending={mutation.isPending}
                type="button"
                variant="destructive"
                size="lg"
                onClick={() => mutation.mutate([])}
              >
                {t("roomWishes.deleteConfirm")}
              </PendingButton>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setIsConfirmingDelete(false)}
              >
                {t("roomWishes.cancel")}
              </Button>
            </div>
          </div>
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <p>{t("roomWishes.empty")}</p>
            <Button
              type="button"
              size="lg"
              onClick={onStartEditing}
            >
              {t("roomWishes.add")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <p>{saved.join(", ")}</p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onStartEditing}
              >
                {t("roomWishes.edit")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                onClick={() => setIsConfirmingDelete(true)}
              >
                {t("roomWishes.delete")}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  )
}
