import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { UploadField } from "@/components/molecules/UploadField"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { notify } from "@/lib/notify"
import { termName } from "@/lib/term-label"

import {
  deleteEventPhoto,
  EVENT_PHOTO,
  eventKeys,
  eventPhotoQueryOptions,
  savePublicPage,
  uploadEventPhoto,
  type OrganizerEvent,
  type PublicPageInput,
} from "@/features/events/api/events"
import { termsQueryOptions } from "@/features/events/api/terms"
import {
  validatePublicPage,
  type PublicPageError,
  type PublicPageField,
} from "@/features/events/lib/public-page"

const SECTION = "public-page"

const valuesOf = (event: OrganizerEvent): PublicPageInput => ({
  name: event.name,
  description: event.description ?? "",
  location: event.location ?? "",
  // Until the event has its own address, the organization's one is offered (the organizer may overwrite it).
  contactEmail: event.contactEmail ?? event.organizationContactEmail ?? "",
  contactPhone: event.contactPhone ?? "",
  publishedInCatalog: event.publishedInCatalog,
})

const isAcceptedType = (file: File): boolean =>
  (EVENT_PHOTO.types as readonly string[]).includes(file.type)

/**
 * What the public page of an event shows, the one source of the event web and the catalog
 * (US-122). A section of the event settings, closed until opened. The photo is sent as soon as it
 * is chosen; the rest is saved with the button, which closes the section again.
 */
// Figma (Design system): US-122 / Nastavení akce · Veřejná prezentace · Úprava · katalog vypnutý · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16135-8343 (mobil 16135-8470)
// Figma (Design system): US-122 / Nastavení akce · Veřejná prezentace · Uložené · katalog zapnutý · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16135-8563 (mobil 16135-8699)
// Figma (Design system): US-122 / Nastavení akce · Veřejná prezentace · Chyba fotografie · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16135-8804 (mobil 16135-8929)
export function PublicPageForm({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const queryClient = useQueryClient()
  const [openSection, setOpenSection] = useState("")
  const [values, setValues] = useState<PublicPageInput>(() => valuesOf(event))
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const { data: terms } = useQuery(termsQueryOptions(event.id))
  const { data: photo } = useQuery(eventPhotoQueryOptions(event.id, event.photoFileName !== null))
  const photoUrl = event.photoFileName ? (photo ?? null) : null

  // Errors show after the first try to save and then follow the fields as they are fixed.
  const errors = hasSubmitted ? validatePublicPage(values) : {}

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
    ])

  const save = useMutation({
    mutationFn: () => savePublicPage(event.id, values),
    onSuccess: async (saved) => {
      notify.success(
        t("publicPage.saved"),
        saved.publishedInCatalog ? t("publicPage.savedPublished") : undefined,
      )
      setHasSubmitted(false)
      setOpenSection("")
      await refresh()
    },
  })
  const upload = useMutation({
    mutationFn: (file: File) => uploadEventPhoto(event.id, file),
    onSuccess: async () => {
      setPhotoError(null)
      notify.success(t("publicPage.upload.doneTitle"))
      await refresh()
    },
    onError: (error) => setPhotoError(error.message),
  })

  const remove = useMutation({
    mutationFn: () => deleteEventPhoto(event.id),
    onSuccess: async () => {
      setPhotoError(null)
      notify.success(t("publicPage.upload.removed"))
      await refresh()
    },
    onError: (error) => setPhotoError(error.message),
  })

  const change = (patch: Partial<PublicPageInput>) =>
    setValues((current) => ({ ...current, ...patch }))

  const field = (name: PublicPageField, id: string) => ({
    id,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-error` : undefined,
  })
  const fieldError = (name: PublicPageField, id: string) => (
    <FieldError
      id={`${id}-error`}
      error={errors[name]}
    />
  )

  const offeredTerms = (terms ?? []).filter((term) => term.cancelledAt === null)

  return (
    <Accordion
      type="single"
      collapsible
      value={openSection}
      onValueChange={setOpenSection}
    >
      <AccordionItem
        value={SECTION}
        className="rounded-lg border bg-card px-3 shadow-sm last:border-b"
      >
        <AccordionTrigger className="my-1 items-center rounded-md px-1 text-lg font-semibold tracking-tight hover:bg-muted hover:no-underline [&>svg]:size-5 [&>svg]:translate-y-0 [&>svg]:text-foreground">
          {t("publicPage.title")}
        </AccordionTrigger>
        {/* The padding keeps the focus ring of the fields from being cut off by the collapsing box. */}
        <AccordionContent className="px-1 pt-1">
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              setHasSubmitted(true)
              if (Object.keys(validatePublicPage(values)).length === 0) save.mutate()
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="public-page-name">{t("publicPage.name")}</Label>
              <Input
                {...field("name", "public-page-name")}
                value={values.name}
                maxLength={200}
                onChange={(e) => change({ name: e.target.value })}
              />
              {fieldError("name", "public-page-name")}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="public-page-description">{t("publicPage.description")}</Label>
              <Textarea
                {...field("description", "public-page-description")}
                value={values.description}
                maxLength={5000}
                onChange={(e) => change({ description: e.target.value })}
              />
              {fieldError("description", "public-page-description")}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="public-page-location">{t("publicPage.location")}</Label>
              <Input
                {...field("location", "public-page-location")}
                value={values.location}
                maxLength={200}
                onChange={(e) => change({ location: e.target.value })}
              />
              {fieldError("location", "public-page-location")}
            </div>

            <h4 className="text-lg font-semibold tracking-tight">{t("publicPage.photoTitle")}</h4>
            <UploadField
              title={t(
                event.photoFileName ? "publicPage.upload.doneTitle" : "publicPage.upload.idleTitle",
              )}
              description={event.photoFileName ?? t("publicPage.upload.hint")}
              buttonLabel={t("publicPage.upload.button")}
              note={t("publicPage.upload.limit")}
              removeLabel={event.photoFileName ? t("publicPage.upload.remove") : undefined}
              onRemove={event.photoFileName ? () => remove.mutate() : undefined}
              previewUrl={photoUrl}
              error={photoError}
              accept={EVENT_PHOTO.types.join(",")}
              isDisabled={upload.isPending || remove.isPending}
              onSelect={(file) => {
                if (!isAcceptedType(file)) {
                  setPhotoError(t("publicPage.upload.invalidType"))
                } else if (file.size > EVENT_PHOTO.maxBytes) {
                  setPhotoError(t("publicPage.upload.tooLarge"))
                } else {
                  upload.mutate(file)
                }
              }}
            />

            <div className="flex flex-col gap-2">
              <Label htmlFor="public-page-email">{t("publicPage.contactEmail")}</Label>
              <Input
                {...field("contactEmail", "public-page-email")}
                type="email"
                value={values.contactEmail}
                maxLength={200}
                onChange={(e) => change({ contactEmail: e.target.value })}
              />
              {fieldError("contactEmail", "public-page-email")}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="public-page-phone">{t("publicPage.contactPhone")}</Label>
              <Input
                {...field("contactPhone", "public-page-phone")}
                type="tel"
                inputMode="tel"
                value={values.contactPhone}
                maxLength={50}
                onChange={(e) => change({ contactPhone: e.target.value })}
              />
              {fieldError("contactPhone", "public-page-phone")}
            </div>

            <h4 className="text-lg font-semibold tracking-tight">{t("publicPage.termsTitle")}</h4>
            <ul className="flex flex-col gap-3">
              {offeredTerms.map((term) => (
                <li
                  key={term.id}
                  className="flex flex-col py-2 tabular-nums"
                >
                  <span>
                    {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })} ·{" "}
                    {formatCzk(term.priceCzk)}
                  </span>
                  {termName(term) ? (
                    <span className="text-sm text-muted-foreground">{termName(term)}</span>
                  ) : null}
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
                variant="outline"
                size="lg"
                className="md:flex-1"
                onClick={() => {
                  setValues(valuesOf(event))
                  setHasSubmitted(false)
                  setPhotoError(null)
                  save.reset()
                  setOpenSection("")
                }}
              >
                {t("publicPage.cancel")}
              </Button>
            </div>
          </form>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function FieldError({ id, error }: { id: string; error: PublicPageError | undefined }) {
  const { t } = useTranslation("events")
  if (!error) return null
  return (
    <p
      id={id}
      className="text-sm text-destructive"
    >
      {t(`publicPage.errors.${error}`)}
    </p>
  )
}
