import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { notify } from "@/lib/notify"

import {
  deleteTransport,
  eventTransportQueryOptions,
  transportKeys,
  type TransportSummary,
} from "@/features/transport/api/transport"

// Deleting a transport: a confirmation, and when participants chose it an extra step — the system
// warns what happens to them and the organizer has to acknowledge it.
// Design proposal (US-402): not in Figma yet.
export function DeleteTransportDialog({
  eventId,
  transport: opened,
  onClose,
}: {
  eventId: string
  transport: TransportSummary
  onClose: () => void
}) {
  const { t } = useTranslation("transport")
  const client = useQueryClient()
  const [isAcknowledged, setIsAcknowledged] = useState(false)
  // The list is refetched while the dialog is open: participants who chose the transport in the
  // meantime show up in the warning instead of being dropped without one.
  const { data } = useQuery(eventTransportQueryOptions(eventId))
  const transport =
    data?.terms.flatMap((term) => term.transports).find((item) => item.id === opened.id) ?? opened
  const hasParticipants = transport.participantsCount > 0
  const mutation = useMutation({
    mutationFn: () => deleteTransport(eventId, transport.id, isAcknowledged),
    onError: async () => {
      await client.invalidateQueries({ queryKey: transportKeys.event(eventId) })
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: transportKeys.event(eventId) }),
        client.invalidateQueries({ queryKey: ["applications"] }),
        client.invalidateQueries({ queryKey: ["participant"] }),
      ])
      notify.success(t("deleted"))
      onClose()
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="gap-4 p-6 sm:max-w-130">
        <DialogHeader>
          <DialogTitle className="text-lg tracking-tight">{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("deleteDescription", { name: transport.kind === "OWN" ? t("own") : transport.name })}
          </DialogDescription>
        </DialogHeader>
        {hasParticipants ? (
          <>
            <Alert variant="destructive">
              <TriangleAlert aria-hidden />
              <AlertTitle>{t("deleteWarningTitle")}</AlertTitle>
              <AlertDescription>
                {t("deleteWarning", { count: transport.participantsCount })}
              </AlertDescription>
            </Alert>
            <div className="flex items-start gap-2">
              <Checkbox
                id="delete-transport-ack"
                checked={isAcknowledged}
                onCheckedChange={(checked) => {
                  setIsAcknowledged(checked === true)
                }}
              />
              <Label
                htmlFor="delete-transport-ack"
                className="leading-snug"
              >
                {t("deleteAck")}
              </Label>
            </div>
          </>
        ) : null}
        {mutation.isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t("deleteFailed")}</AlertTitle>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            disabled={mutation.isPending || (hasParticipants && !isAcknowledged)}
            onClick={() => {
              mutation.mutate()
            }}
          >
            {t(mutation.isPending ? "deleting" : "delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
