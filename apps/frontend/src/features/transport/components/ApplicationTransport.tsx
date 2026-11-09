import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
// Figma (Design system): #65 Doprava · Adam Dvořák · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12943
// Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-13064
export function ApplicationTransport({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("transport")
  const query = useQuery(applicationTransportQueryOptions(applicationId))
  const client = useQueryClient()
  const navigate = useNavigate()
  // What was changed on this page: term → transport id or own.
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
    },
    onSuccess: async () => {
      setChanges({})
      await client.invalidateQueries({ queryKey: transportKeys.application(applicationId) })
      await client.invalidateQueries({ queryKey: ["participant"] })
      notify.success(t("saved"))
      // Saved and confirmed: back to the application, there is nothing more to do here.
      await navigate({ to: ROUTES.participant.application, params: { applicationId } })
    },
  })

  if (!query.data) {
    return query.isError ? (
      <ErrorState
        title={t("loadFailed")}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    ) : (
      <LoadingState />
    )
  }
  const { participantName } = query.data
  // A term without any offered transport has nothing to choose from.
  const terms = query.data.terms.filter((term) => term.options.length > 0)
  const title = t("applicationTitle", { name: participantName })

  return (
    <div className="flex flex-col gap-6">
      <Seo title={title} />
      <BackLink
        to={ROUTES.participant.application}
        params={{ applicationId }}
      >
        {t("backToApplication")}
      </BackLink>
      <SectionHeader title={title} />
      {terms.map((term) => {
        const value = changes[term.termId] ?? term.selectedTransportId ?? ""
        const selected = term.options.find((option) => option.id === value)
        const label = termTitle({ ...term, name: term.termName })
        return (
          <section
            key={term.termId}
            className="flex flex-col gap-4"
          >
            <h3 className="text-xl font-semibold tracking-tight">{label}</h3>
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
                    <h4 className="text-lg font-semibold">{t("departureTitle")}</h4>
                    <p>{departureText(selected.departureAt, t("at"))}</p>
                    <p>{selected.departurePlace}</p>
                  </>
                ) : null}
                {selected.instructions ? (
                  <>
                    <h4 className="text-lg font-semibold">{t("instructionsTitle")}</h4>
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
      <Button
        size="lg"
        disabled={mutation.isPending || Object.keys(changes).length === 0}
        onClick={() => {
          mutation.mutate()
        }}
      >
        {t("save")}
      </Button>
    </div>
  )
}
