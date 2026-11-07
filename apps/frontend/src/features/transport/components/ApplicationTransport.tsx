import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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

import {
  applicationTransportQueryOptions,
  chooseTransport,
  OWN_TRANSPORT_ID,
  transportKeys,
} from "@/features/transport/api/transport"
import { departureText } from "@/features/transport/lib/departure"

// The applicant chooses how the participant gets to the event and sees where and when it leaves.
// Figma (Design system): #65 Doprava · Adam Dvořák · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12943
// Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-13064
export function ApplicationTransport({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("transport")
  const query = useQuery(applicationTransportQueryOptions(applicationId))
  const client = useQueryClient()
  const [choice, setChoice] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: (transportId: string) =>
      chooseTransport(applicationId, transportId === OWN_TRANSPORT_ID ? null : transportId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: transportKeys.application(applicationId) })
      notify.success(t("saved"))
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
  const { options, participantName, selectedTransportId } = query.data
  const value = choice ?? selectedTransportId ?? OWN_TRANSPORT_ID
  const selected = options.find((option) => option.id === value)
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="transport">{t("choiceLabel")}</Label>
        <Select
          value={value}
          onValueChange={setChoice}
        >
          <SelectTrigger
            id="transport"
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.id}
                value={option.id}
              >
                {option.name}
              </SelectItem>
            ))}
            <SelectItem value={OWN_TRANSPORT_ID}>{t("own")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {selected ? (
        <Card className="gap-4 p-4">
          <h3 className="text-xl font-semibold">{t("departureTitle")}</h3>
          <p>{departureText(selected.departureAt, t("at"))}</p>
          <p>{selected.departurePlace}</p>
        </Card>
      ) : null}
      {mutation.isError ? (
        <ErrorState
          title={t("saveFailed")}
          error={mutation.error}
        />
      ) : null}
      <Button
        size="lg"
        disabled={mutation.isPending}
        onClick={() => {
          mutation.mutate(value)
        }}
      >
        {t("save")}
      </Button>
    </div>
  )
}
