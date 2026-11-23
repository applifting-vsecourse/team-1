import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Info, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
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
import { cn } from "@/lib/utils"

import {
  deleteTransport,
  eventTransportQueryOptions,
  transportKeys,
  type TransportSummary,
} from "@/features/transport/api/transport"

// Deleting a transport: a confirmation, and when participants chose it an extra step — the system
// warns what happens to them and the organizer has to acknowledge it.
// Figma: #402, deleting unused transport · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=22642-93908 (mobile 22642-94065)
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
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-4 sm:max-w-160 sm:p-6",
          !hasParticipants &&
            "min-h-[min(20.25rem,calc(100dvh-2rem))] content-between sm:min-h-[min(17.5rem,calc(100dvh-2rem))]",
        )}
      >
        <DialogHeader className={hasParticipants ? undefined : "gap-2 text-left"}>
          <DialogTitle className={cn("tracking-tight", !hasParticipants && "text-2xl")}>
            {t(hasParticipants ? "deleteTitle" : "deleteUnusedTitle")}
          </DialogTitle>
          <DialogDescription>
            {hasParticipants
              ? t("deleteDescription", {
                  name: transport.kind === "OWN" ? t("own") : transport.name,
                })
              : transport.kind === "OWN"
                ? t("own")
                : transport.name}
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
        ) : (
          <Alert>
            <Info aria-hidden />
            <AlertTitle>{t("deleteUnusedInfo")}</AlertTitle>
            <AlertDescription>{t("deleteUnusedEffect")}</AlertDescription>
          </Alert>
        )}
        {mutation.isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t("deleteFailed")}</AlertTitle>
          </Alert>
        ) : null}
        <DialogFooter className={hasParticipants ? undefined : "flex-row sm:justify-start"}>
          <Button
            variant={hasParticipants ? "outline" : "ghost"}
            className={hasParticipants ? undefined : "h-12 flex-1 sm:flex-none"}
            size="lg"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {t("cancel")}
          </Button>
          <PendingButton
            isPending={mutation.isPending}
            variant="destructive"
            className={hasParticipants ? undefined : "h-12 flex-1 sm:min-w-53 sm:flex-none"}
            size="lg"
            disabled={mutation.isPending || (hasParticipants && !isAcknowledged)}
            onClick={() => {
              mutation.mutate()
            }}
          >
            {t(mutation.isPending ? "deleting" : hasParticipants ? "delete" : "deleteUnusedAction")}
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
