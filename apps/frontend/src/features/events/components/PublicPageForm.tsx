import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { UploadField } from "@/components/molecules/UploadField"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import {
  EVENT_PHOTO,
  eventKeys,
  savePublicPage,
  uploadEventPhoto,
  type OrganizerEvent,
} from "@/features/events/api/events"
import { termsQueryOptions } from "@/features/events/api/terms"

type Values = {
  name: string
  description: string
  location: string
  contactEmail: string
  contactPhone: string
  publishedInCatalog: boolean
}

const valuesOf = (event: OrganizerEvent): Values => ({
  name: event.name,
  description: event.description ?? "",
  location: event.location ?? "",
  contactEmail: event.contactEmail ?? "",
  contactPhone: event.contactPhone ?? "",
  publishedInCatalog: event.publishedInCatalog,
})

const isAcceptedPhoto = (file: File): boolean =>
  (EVENT_PHOTO.types as readonly string[]).includes(file.type) && file.size <= EVENT_PHOTO.maxBytes

/**
 * What the public page of an event shows, the one source of the event web and the catalog
 * (US-122). The photo is sent as soon as it is chosen; the rest is saved with the button.
 */
// Figma (Design system): US-122 / Nastavení akce · Veřejná prezentace · Úprava · katalog vypnutý · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16135-8343 (mobil 16135-8470)
// Figma (Design system): US-122 / Nastavení akce · Veřejná prezentace · Uložené · katalog zapnutý · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16135-8563 (mobil 16135-8699)
// Figma (Design system): US-122 / Nastavení akce · Veřejná prezentace · Chyba fotografie · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16135-8804 (mobil 16135-8929)
export function PublicPageForm({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Values>(() => valuesOf(event))
  const [isSaved, setIsSaved] = useState(false)
  const [isPhotoRejected, setIsPhotoRejected] = useState(false)
  const { data: terms } = useQuery(termsQueryOptions(event.id))

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
    ])

  const save = useMutation({
    mutationFn: () => savePublicPage(event.id, values),
    onSuccess: async () => {
      setIsSaved(true)
      await refresh()
    },
  })
  const upload = useMutation({
    mutationFn: (file: File) => uploadEventPhoto(event.id, file),
    onSuccess: async () => {
      setIsPhotoRejected(false)
      await refresh()
    },
    onError: () => setIsPhotoRejected(true),
  })

  const change = (patch: Partial<Values>) => {
    setValues((current) => ({ ...current, ...patch }))
    setIsSaved(false)
  }

  const photoState = isPhotoRejected ? "error" : event.photoFileName ? "done" : "idle"
  const offeredTerms = (terms ?? []).filter((term) => term.cancelledAt === null)

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <Card className="gap-4 p-4">
        <h2 className="text-2xl font-semibold tracking-tight">{t("publicPage.title")}</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="public-page-name">{t("publicPage.name")}</Label>
          <Input
            id="public-page-name"
            value={values.name}
            maxLength={200}
            required
            onChange={(e) => change({ name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="public-page-description">{t("publicPage.description")}</Label>
          <Textarea
            id="public-page-description"
            value={values.description}
            maxLength={5000}
            onChange={(e) => change({ description: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="public-page-location">{t("publicPage.location")}</Label>
          <Input
            id="public-page-location"
            value={values.location}
            maxLength={200}
            onChange={(e) => change({ location: e.target.value })}
          />
        </div>

        <h3 className="text-2xl font-semibold tracking-tight">{t("publicPage.photoTitle")}</h3>
        <UploadField
          state={photoState}
          title={t(
            photoState === "done"
              ? "publicPage.upload.doneTitle"
              : photoState === "error"
                ? "publicPage.upload.errorTitle"
                : "publicPage.upload.idleTitle",
          )}
          description={
            photoState === "done" ? (event.photoFileName ?? "") : t("publicPage.upload.hint")
          }
          buttonLabel={t("publicPage.upload.button")}
          ringValue={t("publicPage.upload.ringValue")}
          ringLabel={t("publicPage.upload.ringLabel")}
          accept={EVENT_PHOTO.types.join(",")}
          isDisabled={upload.isPending}
          onSelect={(file) => {
            if (isAcceptedPhoto(file)) upload.mutate(file)
            else setIsPhotoRejected(true)
          }}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="public-page-email">{t("publicPage.contactEmail")}</Label>
          <Input
            id="public-page-email"
            type="email"
            value={values.contactEmail}
            maxLength={200}
            onChange={(e) => change({ contactEmail: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="public-page-phone">{t("publicPage.contactPhone")}</Label>
          <Input
            id="public-page-phone"
            type="tel"
            value={values.contactPhone}
            maxLength={50}
            onChange={(e) => change({ contactPhone: e.target.value })}
          />
        </div>

        <h3 className="text-2xl font-semibold tracking-tight">{t("publicPage.termsTitle")}</h3>
        <ul className="flex flex-col gap-3">
          {offeredTerms.map((term) => (
            <li
              key={term.id}
              className="py-2 tabular-nums"
            >
              {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })} ·{" "}
              {formatCzk(term.priceCzk)}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">{t("publicPage.termsHint")}</p>

        <div className="flex items-center gap-3 py-2">
          <Checkbox
            id="public-page-published"
            checked={values.publishedInCatalog}
            onCheckedChange={(checked) => change({ publishedInCatalog: checked === true })}
          />
          <Label htmlFor="public-page-published">{t("publicPage.publish")}</Label>
        </div>
        <p className="text-sm text-muted-foreground">{t("publicPage.publishHint")}</p>

        {save.isError ? (
          <ErrorState
            title={t("publicPage.saveFailed")}
            error={save.error}
          />
        ) : null}
        {isSaved && !save.isPending ? (
          <Alert>
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>{t("publicPage.saved")}</AlertTitle>
            {event.publishedInCatalog ? (
              <AlertDescription>{t("publicPage.savedPublished")}</AlertDescription>
            ) : null}
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 md:flex-row-reverse">
          <Button
            type="submit"
            size="lg"
            className="md:flex-1"
            disabled={save.isPending}
          >
            {t("publicPage.save")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="md:flex-1"
            onClick={() => {
              setValues(valuesOf(event))
              setIsSaved(false)
              save.reset()
            }}
          >
            {t("publicPage.cancel")}
          </Button>
        </div>
      </Card>
    </form>
  )
}
