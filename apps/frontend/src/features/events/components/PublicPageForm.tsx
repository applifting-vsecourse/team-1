import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PendingButton } from "@/components/atoms/PendingButton"
import { ErrorState } from "@/components/molecules/ErrorState"
import { SETTINGS_CARD_CLASS, SettingsCardHeader } from "@/components/molecules/SettingsCard"
import { UploadField } from "@/components/molecules/UploadField"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
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

const MAX_EMAIL_LENGTH = 200

const offeredOrganizationEmail = (email: string | null): string =>
  email && email.length <= MAX_EMAIL_LENGTH ? email : ""

const valuesOf = (event: OrganizerEvent): PublicPageInput => ({
  name: event.name,
  description: event.description ?? "",
  location: event.location ?? "",
  // Until the event has its own address, the organization's one is offered (the organizer may
  // overwrite it) — unless it is longer than the API accepts, which would block every save.
  contactEmail: event.contactEmail ?? offeredOrganizationEmail(event.organizationContactEmail),
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
// Figma v2: US-122 Úprava · katalog vypnutý · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19395-33879; uloženo · katalog zapnutý 19395-34774; chyba fotografie 19395-35250
export function PublicPageForm({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation(["events", "common"])
  const queryClient = useQueryClient()
  const [openSection, setOpenSection] = useState("")
  const [values, setValues] = useState<PublicPageInput>(() => valuesOf(event))
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [uploadFraction, setUploadFraction] = useState<number | undefined>(undefined)
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
        saved.publishedInCatalog
          ? t("publicPage.savedPublished")
          : t(
              event.applicationsOpen ? "publicPage.savedDirectLink" : "publicPage.savedUnpublished",
            ),
      )
      setHasSubmitted(false)
      setOpenSection("")
      await refresh()
    },
  })
  const upload = useMutation({
    mutationFn: (file: File) => uploadEventPhoto(event.id, file, setUploadFraction),
    onMutate: () => setUploadFraction(undefined),
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
        className={`rounded-lg border border-border-strong bg-card text-card-foreground last:border-b nested:border-border ${SETTINGS_CARD_CLASS} py-0 sm:py-0`}
      >
        <AccordionTrigger
          aria-label={t("publicPage.title")}
          aria-describedby="public-page-summary"
          className="items-center rounded-md py-4 hover:no-underline sm:py-6 [&>svg]:size-5 [&>svg]:translate-y-0 [&>svg]:text-foreground"
        >
          <SettingsCardHeader
            icon={Globe}
            as="span"
            title={t("publicPage.title")}
            description={t("publicPage.sectionDescription")}
            descriptionId="public-page-summary"
            aside={
              <Badge variant={event.publishedInCatalog ? "success" : "secondary"}>
                {t(event.publishedInCatalog ? "publicPage.listed" : "publicPage.notListed")}
              </Badge>
            }
          />
        </AccordionTrigger>
        {/* The padding keeps the focus ring of the fields from being cut off by the collapsing box. */}
        <AccordionContent className="px-1 pt-1 pb-4 sm:pb-6">
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              setHasSubmitted(true)
              if (Object.keys(validatePublicPage(values)).length === 0) save.mutate()
            }}
          >
            <section className="flex flex-col gap-4">
              <h4 className="text-lg font-semibold tracking-tight">
                {t("publicPage.contentTitle")}
              </h4>
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
            </section>

            <section className="flex flex-col gap-4 border-t border-border pt-6">
              <h4 className="text-lg font-semibold tracking-tight">{t("publicPage.photoTitle")}</h4>
              <UploadField
                title={t(
                  event.photoFileName
                    ? "publicPage.upload.doneTitle"
                    : "publicPage.upload.idleTitle",
                )}
                description={event.photoFileName ?? t("publicPage.upload.hint")}
                buttonLabel={t("publicPage.upload.button")}
                note={t("publicPage.upload.limit")}
                removeLabel={event.photoFileName ? t("publicPage.upload.remove") : undefined}
                onRemove={event.photoFileName ? () => remove.mutate() : undefined}
                previewUrl={photoUrl}
                uploadLabel={upload.isPending ? t("publicPage.upload.uploading") : undefined}
                uploadFraction={uploadFraction}
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
            </section>

            <section className="flex flex-col gap-4 border-t border-border pt-6">
              <h4 className="text-lg font-semibold tracking-tight">
                {t("publicPage.contactTitle")}
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            </section>

            <section className="flex flex-col gap-4 border-t border-border pt-6">
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
              <div>
                <Button
                  asChild
                  variant="outline"
                >
                  <Link
                    to={ROUTES.organizer.eventTerms}
                    params={{ eventId: event.id }}
                    target="_blank"
                    rel="noopener"
                  >
                    {t("publicPage.editTerms")}
                  </Link>
                </Button>
              </div>
            </section>

            <section className="flex flex-col gap-4 border-t border-border pt-6">
              <h4 className="text-lg font-semibold tracking-tight">
                {t("publicPage.catalogTitle")}
              </h4>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="public-page-published"
                  checked={values.publishedInCatalog}
                  onCheckedChange={(checked) => change({ publishedInCatalog: checked === true })}
                />
                <Label htmlFor="public-page-published">{t("publicPage.publish")}</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {values.publishedInCatalog || !event.applicationsOpen
                  ? t("publicPage.publishHint")
                  : t("publicPage.directLinkHint")}
              </p>
            </section>

            {event.applicationsOpen ? (
              <div>
                <Button
                  asChild
                  variant="outline"
                >
                  <Link
                    to={ROUTES.event}
                    params={{ publicToken: event.publicToken }}
                    target="_blank"
                    rel="noopener"
                  >
                    {t("publicPage.preview")}
                  </Link>
                </Button>
              </div>
            ) : null}
            {save.isError ? (
              <ErrorState
                title={t("publicPage.saveFailed")}
                error={save.error}
              />
            ) : null}

            <div className="flex flex-col gap-3 md:flex-row-reverse">
              <PendingButton
                type="submit"
                size="lg"
                className="md:flex-1"
                isPending={save.isPending}
              >
                {save.isPending ? t("state.saving", { ns: "common" }) : t("publicPage.save")}
              </PendingButton>
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
  const { t } = useTranslation(["events", "common"])
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
