import { useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { BackButton } from "@/components/atoms/BackLink"
import { PendingButton } from "@/components/atoms/PendingButton"
import { ErrorState } from "@/components/molecules/ErrorState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { termLine } from "@/lib/term-label"

import {
  copyProgram,
  type ProgramCopyResult,
  type ProgramCopyStrategy,
  type TermProgram,
} from "@/features/program/api/program"
import { previewCopy } from "@/features/program/lib/copy"
import { daysOfTerm, formatDayHeader, timeRange } from "@/features/program/lib/days"

const named = (term: TermProgram) => ({ ...term, name: term.termName })

// One step: pick the source term, the preview of the copy appears below it. With a program already in
// the target the organizer chooses to add to it or replace it (same as the rooms, D-115).
// Figma v2 US-142: Vybrat zdrojový termín · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-16021
// Náhled do prázdného programu · 24910-16314 · Přidat ke stávajícím · 24910-16615 · Nahradit · 24910-16923
// Žádný vhodný zdrojový termín · 24910-17640 · Kopírování se nezdařilo · 24910-18026
export function CopyProgramDialog({
  eventId,
  target,
  sourceTerms,
  onClose,
  onCopied,
}: {
  eventId: string
  target: TermProgram
  /** The other terms of the event. */
  sourceTerms: TermProgram[]
  onClose: () => void
  onCopied: (result: ProgramCopyResult, strategy: ProgramCopyStrategy) => Promise<void>
}) {
  const { t, i18n } = useTranslation("program")
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [sourceId, setSourceId] = useState("")
  const [strategy, setStrategy] = useState<ProgramCopyStrategy>("ADD")
  const candidates = sourceTerms.filter((item) => item.blocks.length > 0)
  const source = candidates.find((item) => item.termId === sourceId)
  const hasTargetBlocks = target.blocks.length > 0
  const isReplacing = hasTargetBlocks && strategy === "REPLACE"
  const effective: ProgramCopyStrategy = hasTargetBlocks ? strategy : "ADD"
  const plan = source ? previewCopy(source, target, isReplacing ? [] : target.blocks) : null
  const first = plan?.copies[0]
  const mutation = useMutation({
    mutationFn: () => copyProgram(eventId, target.termId, sourceId, effective),
    onSuccess: async (result) => {
      await onCopied(result, effective)
      onClose()
    },
  })
  const count = plan?.copies.length ?? 0
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        className="bg-card sm:max-w-170"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          cancelRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("copy.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex min-w-0 flex-col gap-4">
          <dl className="flex min-w-0 flex-col gap-1 rounded-lg bg-accent/50 p-3">
            <dt className="text-xs text-muted-foreground">{t("copy.target")}</dt>
            <dd className="text-sm font-semibold">{termLine(named(target))}</dd>
          </dl>
          {candidates.length === 0 ? (
            <Alert>
              <AlertTitle>{t("copy.noSourceTitle")}</AlertTitle>
              <AlertDescription className="text-foreground">
                {t("copy.noSourceBody")}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="copy-program-source">{t("copy.source")}</Label>
              <Select
                value={sourceId}
                onValueChange={setSourceId}
              >
                <SelectTrigger
                  id="copy-program-source"
                  className="w-full min-w-0 bg-card"
                >
                  <SelectValue placeholder={t("copy.sourcePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((item) => (
                    <SelectItem
                      key={item.termId}
                      value={item.termId}
                    >
                      {termLine(named(item))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {plan && source ? (
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">
                  {t("copy.preview", { count: plan.copies.length })}
                </h3>
                <p className="text-sm text-muted-foreground">{t("copy.dayRule")}</p>
              </div>
              {first ? (
                <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-muted p-3 text-sm">
                  <span className="text-xs text-muted-foreground">
                    {t("copy.firstBlock", {
                      day: daysOfTerm(source).indexOf(first.sourceDate) + 1,
                      from: formatDayHeader(first.sourceDate).date,
                      to: formatDayHeader(first.date).date,
                    })}
                  </span>
                  <span className="font-semibold">{first.name}</span>
                  <span>
                    {timeRange(first)}
                    {first.place ? ` · ${first.place}` : ""}
                  </span>
                  {first.description ? (
                    <span className="text-muted-foreground">{first.description}</span>
                  ) : null}
                </div>
              ) : null}
              {hasTargetBlocks ? (
                <div className="flex flex-col gap-2">
                  <Label
                    id="copy-program-strategy"
                    className="text-sm font-semibold"
                  >
                    {t("copy.strategy")}
                  </Label>
                  <RadioGroup
                    value={strategy}
                    onValueChange={(value) => setStrategy(value as ProgramCopyStrategy)}
                    aria-labelledby="copy-program-strategy"
                    disabled={mutation.isPending}
                  >
                    {(["ADD", "REPLACE"] as const).map((option) => (
                      <div
                        key={option}
                        className="flex min-h-11 items-center gap-3"
                      >
                        <RadioGroupItem
                          id={`copy-program-${option}`}
                          value={option}
                          className="size-5"
                        />
                        <Label
                          htmlFor={`copy-program-${option}`}
                          className="text-base font-normal"
                        >
                          {t(option === "ADD" ? "copy.strategyAdd" : "copy.strategyReplace")}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <p className="text-sm text-muted-foreground">
                    {t(isReplacing ? "copy.replaceBody" : "copy.addBody", {
                      count: target.blocks.length,
                    })}
                  </p>
                </div>
              ) : null}
              {plan.skipped > 0 ? (
                <Alert variant="warning">
                  <AlertTitle>{t("copy.skippedHeading", { count: plan.skipped })}</AlertTitle>
                  <AlertDescription className="text-foreground">
                    {t("copy.skippedBody", {
                      days: new Intl.ListFormat(i18n.language, { type: "conjunction" }).format(
                        plan.skippedDays.map((day) => t("copy.dayNumber", { day })),
                      ),
                    })}
                  </AlertDescription>
                </Alert>
              ) : null}
              {plan.overlaps.length > 0 ? (
                <Alert variant="warning">
                  <AlertTitle>
                    {t("copy.overlapHeading", { count: plan.overlaps.length })}
                  </AlertTitle>
                  <AlertDescription className="text-foreground">
                    {plan.overlaps
                      .map((item) =>
                        t("copy.overlapItem", { first: item.first, second: item.second }),
                      )
                      .join(" ")}
                    {` ${t("copy.overlapHint")}`}
                  </AlertDescription>
                </Alert>
              ) : null}
              {count === 0 ? <p>{t("copy.nothingToCopy")}</p> : null}
              <p className="text-sm text-muted-foreground">{t("copy.sourceUnchanged")}</p>
            </div>
          ) : null}
        </div>
        {mutation.isError ? (
          <ErrorState
            title={t("copy.failed")}
            error={mutation.error}
          />
        ) : null}
        <DialogFooter className="gap-4">
          <DialogClose asChild>
            <BackButton
              ref={cancelRef}
              disabled={mutation.isPending}
            >
              {t("copy.cancel")}
            </BackButton>
          </DialogClose>
          <PendingButton
            isPending={mutation.isPending}
            size="lg"
            variant={isReplacing ? "destructive" : "default"}
            className="sm:w-auto"
            disabled={!plan || count === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isError
              ? t("copy.retry")
              : isReplacing
                ? t("copy.replaceConfirm")
                : t("copy.confirm", { count })}
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
