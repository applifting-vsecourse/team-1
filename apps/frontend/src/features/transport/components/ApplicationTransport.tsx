import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { notify } from "@/lib/notify"
import { termTitle } from "@/lib/term-label"

import {
  applicationTransportQueryOptions,
  chooseTransport,
  transportKeys,
} from "@/features/transport/api/transport"
import { departureText } from "@/features/transport/lib/departure"

// The applicant chooses, for each term, how the participant gets to the event and sees where and
// when it leaves.
// Figma (Design system v2): #402 / Výběr způsobu dopravy · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-39327 (360 px: node-id=22640-39416)
export function ApplicationTransport({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation(["transport", "common"])
  const query = useQuery(applicationTransportQueryOptions(applicationId))
  const client = useQueryClient()
  const navigate = useNavigate()
  const termHash = window.location.hash
  useEffect(() => {
    if (query.isSuccess && termHash) document.getElementById(termHash.slice(1))?.focus()
  }, [query.isSuccess, termHash])
  const close = async () => {
    await navigate({ to: ROUTES.participant.application, params: { applicationId }, replace: true })
    // The trigger is a link on the previous route, so Radix cannot restore focus to it.
    requestAnimationFrame(() => {
      const href = ROUTES.participant.applicationTransport.replace(
        "$applicationId",
        encodeURIComponent(applicationId),
      )
      Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .find((link) => link.pathname === href && (!termHash || link.hash === termHash))
        ?.focus()
    })
  }
  // What was changed in this dialog: term → transport id or own.
  const [changes, setChanges] = useState<Record<string, string>>({})
  const mutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        Object.entries(changes).map(([termId, id]) => chooseTransport(applicationId, termId, id)),
      )
    },
    onError: async () => {
      // A transport may have been deleted meanwhile: show what is still on offer.
      await client.invalidateQueries({ queryKey: transportKeys.application(applicationId) })
      // Drop choices that are no longer on offer, keep the valid ones.
      const fresh = client.getQueryData(applicationTransportQueryOptions(applicationId).queryKey)
      if (!fresh) return
      setChanges((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([termId, id]) =>
            fresh.terms.some(
              (term) => term.termId === termId && term.options.some((option) => option.id === id),
            ),
          ),
        ),
      )
    },
    onSuccess: async () => {
      setChanges({})
      notify.success(t("saved"))
      void client.invalidateQueries({ queryKey: transportKeys.application(applicationId) })
      void client.invalidateQueries({ queryKey: ["participant"] })
      // Saved and confirmed: back to the application, there is nothing more to do here.
      await close()
    },
  })

  const terms = query.data?.terms.filter((term) => term.options.length > 0) ?? []
  const title = t("chooseTitle")

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) void close()
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-3rem)] gap-5 overflow-y-auto rounded-2xl max-sm:top-6 max-sm:translate-y-0"
      >
        <Seo
          title={query.data ? t("applicationTitle", { name: query.data.participantName }) : title}
        />
        <DialogTitle className="pr-8 text-[22px]/8 font-semibold">{title}</DialogTitle>
        {query.isPending ? <LoadingState /> : null}
        {query.isError ? (
          <ErrorState
            title={t("loadFailed")}
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : null}
        {terms.map((term) => {
          const value = changes[term.termId] ?? term.selectedTransportId ?? ""
          const selected = term.options.find((option) => option.id === value)
          const label = termTitle({ ...term, name: term.termName })
          return (
            <section
              key={term.termId}
              className="flex flex-col gap-4"
            >
              <h3
                className={terms.length === 1 ? "sr-only" : "text-xl font-semibold tracking-tight"}
              >
                {label}
              </h3>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`transport-${term.termId}`}>{t("choiceLabel")}</Label>
                <Select
                  value={value}
                  onValueChange={(next) => {
                    setChanges((current) => ({ ...current, [term.termId]: next }))
                  }}
                >
                  <SelectTrigger
                    id={`transport-${term.termId}`}
                    className="w-full"
                  >
                    <SelectValue placeholder={t("choicePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {term.options.map((option) => (
                      <SelectItem
                        key={option.id}
                        value={option.id}
                      >
                        {option.kind === "OWN" ? t("own") : option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selected && (selected.departureAt || selected.instructions) ? (
                <Card className="gap-4 p-4">
                  {selected.departureAt ? (
                    <>
                      <h4 className="text-2xl font-bold tracking-tight">{t("departureTitle")}</h4>
                      <p>{departureText(selected.departureAt, t("at"))}</p>
                      <p>{selected.departurePlace}</p>
                    </>
                  ) : null}
                  {selected.instructions ? (
                    <>
                      <h4 className="text-2xl font-bold tracking-tight">
                        {t("instructionsTitle")}
                      </h4>
                      <p className="whitespace-pre-line">{selected.instructions}</p>
                    </>
                  ) : null}
                </Card>
              ) : null}
            </section>
          )
        })}
        {mutation.isError ? (
          <ErrorState
            title={t("saveFailed")}
            error={mutation.error}
          />
        ) : null}
        {terms.length > 0 ? (
          <Button
            size="lg"
            className="h-12 w-full"
            aria-busy={mutation.isPending}
            disabled={mutation.isPending || Object.keys(changes).length === 0}
            onClick={() => {
              mutation.mutate()
            }}
          >
            {mutation.isPending ? t("state.saving", { ns: "common" }) : t("chooseSave")}
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
