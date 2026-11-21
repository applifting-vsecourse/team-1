import { useState } from "react"
import { format } from "date-fns"
import { Info, X } from "lucide-react"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { CharacterCounter } from "@/components/atoms/CharacterCounter"
import { TermPrice } from "@/components/atoms/MoneyAmount"
import { DateField } from "@/components/molecules/DateField"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatDateRange } from "@/lib/date"
import { termName } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import type { PublicTerm } from "@/features/application-form/api/publicEvent"
import {
  GENDERS,
  MAX_ACCOMMODATION_NOTE_LENGTH,
  type ApplicationFormDraft,
} from "@/features/application-form/lib/application-form-schema"

// Figma (Design system): "DS / Registration participant"
// V07 https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15507-914 (mobile 15507-1033)
// errors https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15506-544
// US-120 gender label + explanation and US-38 individual accommodation are kept from their stories.

type ParticipantFieldsProps = {
  /** Position in the form, 0-based. */
  index: number
  terms: PublicTerm[]
  /** Any participant can be removed while at least one other participant remains. */
  onRemove?: () => void
  isDisabled?: boolean
}

/** One participant: own personal data and own choice of terms. */
export function ParticipantFields({ index, terms, onRemove, isDisabled }: ParticipantFieldsProps) {
  const { t } = useTranslation("applicationForm")
  const { control } = useFormContext<ApplicationFormDraft>()
  const [firstName, lastName] = useWatch({
    control,
    name: [`participants.${index}.firstName`, `participants.${index}.lastName`],
  })
  const isIndividual = useWatch({
    control,
    name: `participants.${index}.individualAccommodation`,
  })
  const number = index + 1
  const termsMessageId = `participant-${index}-terms-message`
  const name = [firstName, lastName].filter(Boolean).join(" ").trim()

  return (
    <Card className="gap-4 p-[15px]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-2xl font-semibold">
          {name
            ? t("form.participantTitleNamed", { number, name })
            : t("form.participantTitle", { number })}
        </h3>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            disabled={isDisabled}
            aria-label={t("form.removeParticipantAria", { number })}
            onClick={onRemove}
          >
            <X className="size-5" />
          </Button>
        ) : null}
      </div>

      <div className="grid items-start gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={`participants.${index}.firstName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.firstName")}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`participants.${index}.lastName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.lastName")}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`participants.${index}.birthDate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="data-[error=true]:text-foreground">
                {t("form.birthDate")}
              </FormLabel>
              <FormControl>
                <DateField
                  min="1900-01-01"
                  max={format(new Date(), "yyyy-MM-dd")}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs leading-[18px] font-medium" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`participants.${index}.gender`}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel>{t("form.gender")}</FormLabel>
                <GenderHelp index={index} />
              </div>
              <Select
                value={field.value ?? ""}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger
                    className="w-full"
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder={t("form.genderPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GENDERS.map((gender) => (
                    <SelectItem
                      key={gender}
                      value={gender}
                    >
                      {gender === "FEMALE" ? t("form.genderFemale") : t("form.genderMale")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-col">
                <FormMessage className="text-xs leading-[18px] font-medium" />
              </div>
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name={`participants.${index}.termIds`}
        render={({ field, fieldState }) => (
          <FormItem>
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-2xl font-semibold">{t("form.terms")}</legend>
              {terms.map((term) => {
                const id = `participant-${index}-term-${term.id}`
                const selected = field.value ?? []
                const isSelected = selected.includes(term.id)
                const isInvalid =
                  fieldState.invalid &&
                  (fieldState.error?.type !== "duplicate" ||
                    fieldState.error.types?.termId === term.id)
                return (
                  <Label
                    key={term.id}
                    htmlFor={id}
                    className={cn(
                      "min-h-20 cursor-pointer gap-2 rounded-lg border border-border bg-card p-4 text-sm leading-5 transition-colors hover:bg-accent",
                      isSelected && "border-2 border-primary bg-accent",
                      isInvalid && "border-2 border-action-destructive",
                      isDisabled && "cursor-default opacity-65",
                    )}
                  >
                    <Checkbox
                      id={id}
                      className="size-6"
                      disabled={isDisabled}
                      checked={isSelected}
                      onCheckedChange={(isChecked) =>
                        field.onChange(
                          isChecked
                            ? [...selected, term.id]
                            : selected.filter((v) => v !== term.id),
                        )
                      }
                      onBlur={field.onBlur}
                      aria-invalid={isInvalid}
                      aria-describedby={isInvalid ? termsMessageId : undefined}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span
                        className={cn("font-medium", isSelected && "text-primary dark:text-link")}
                      >
                        {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
                      </span>
                      {termName(term) ? (
                        <>
                          <span className="sr-only"> · </span>
                          <span className="text-sm text-muted-foreground">{termName(term)}</span>
                        </>
                      ) : null}
                    </span>
                    <span className="sr-only"> · </span>
                    <TermPrice
                      className="font-medium"
                      amountCzk={term.priceCzk}
                    />
                  </Label>
                )
              })}
            </fieldset>
            <FormMessage id={termsMessageId} />
          </FormItem>
        )}
      />

      {/* US-38: below the terms, set off by a hairline; the note appears once the box is ticked. */}
      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <FormField
          control={control}
          name={`participants.${index}.individualAccommodation`}
          render={({ field }) => (
            <FormItem className="gap-1">
              <div
                id={individualAnchor(index)}
                className="flex min-h-11 items-center gap-3"
              >
                <FormControl>
                  <Checkbox
                    className="size-5"
                    checked={field.value}
                    onCheckedChange={(isChecked) => field.onChange(isChecked === true)}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormLabel className="flex-1 cursor-pointer self-stretch leading-5 font-normal">
                  {t("form.individualAccommodation")}
                </FormLabel>
              </div>
              <FormDescription className="pl-8 text-sm">
                {t("form.individualAccommodationHint")}
              </FormDescription>
              <FormDescription className="pl-8 text-sm">
                {t("form.individualAccommodationFriends")}
              </FormDescription>
            </FormItem>
          )}
        />
        {isIndividual ? (
          <FormField
            control={control}
            name={`participants.${index}.accommodationRequest`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.accommodationRequest")}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="min-h-32"
                  />
                </FormControl>
                <div className="flex items-start gap-3">
                  <FormDescription className="flex-1 text-sm">
                    {t("form.accommodationRequestHint")}
                  </FormDescription>
                  <FormMessage />
                  <CharacterCounter
                    count={field.value.length}
                    max={MAX_ACCOMMODATION_NOTE_LENGTH}
                  />
                </div>
              </FormItem>
            )}
          />
        ) : null}
      </div>
    </Card>
  )
}

/** The id of the individual accommodation row of one participant, the target of the link in the gender help. */
const individualAnchor = (index: number) => `participant-${index}-individual-accommodation`

/**
 * #528: the short help next to the gender question. A popover, not a tooltip: it holds a link, so it
 * opens by keyboard, touch and screen reader. The link jumps to the individual accommodation box.
 */
// Figma (Design system v2): #528 Přihláška · nápověda u pohlaví otevřená · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27257-156197 (mobile: 27257-156225)
function GenderHelp({ index }: { index: number }) {
  const { t } = useTranslation("applicationForm")
  const [isOpen, setIsOpen] = useState(false)
  const jump = () => {
    setIsOpen(false)
    const box = document
      .getElementById(individualAnchor(index))
      ?.querySelector<HTMLElement>("[role=checkbox]")
    box?.scrollIntoView({ block: "center" })
    // After the popover has returned focus to its trigger.
    setTimeout(() => box?.focus(), 0)
  }
  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={t("form.genderHelpLabel")}
        >
          <Info
            className="size-4 text-muted-foreground"
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 text-sm"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <p>{t("form.genderHelp")}</p>
        <button
          type="button"
          className="text-left font-medium text-link underline underline-offset-2"
          onClick={jump}
        >
          {t("form.genderHelpLink")}
        </button>
      </PopoverContent>
    </Popover>
  )
}
