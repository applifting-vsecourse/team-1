import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { formatCzk } from "@/lib/money"

import { simulatePayment } from "@/features/participant/api/applications"

type SimulatePaymentButtonProps = { applicationId: string; termId: string; amountCzk: number }

/**
 * Staging and demo only (US-115): records a simulated payment of the term's remaining debt. The
 * parent renders it only when the backend says `canSimulatePayment`.
 */
// Figma (Design system v2): US-115 / Detail přihlášky · Platby · simulace · Návrh A · simulace termínu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21594-25942 (360 px: node-id=21594-26323)
export function SimulatePaymentButton({
  applicationId,
  termId,
  amountCzk,
}: SimulatePaymentButtonProps) {
  const { t } = useTranslation(["participant", "common"])
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => simulatePayment(applicationId, termId),
    onSuccess: () => client.invalidateQueries({ queryKey: ["participant", "applications"] }),
  })

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {t("payment.simulation.termAmount", { amount: formatCzk(amountCzk) })}
      </p>
      {mutation.isError && (
        <Alert variant="destructive">
          <AlertTitle>{t("payment.simulation.failed")}</AlertTitle>
        </Alert>
      )}
      <PendingButton
        type="button"
        size="lg"
        className="w-full"
        isPending={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isError ? t("common:state.retry") : t("payment.simulation.paid")}
      </PendingButton>
    </div>
  )
}
