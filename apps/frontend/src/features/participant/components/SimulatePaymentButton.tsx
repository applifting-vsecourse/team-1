import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { formatCzk } from "@/lib/money"
import { notify } from "@/lib/notify"

import { simulatePayment } from "@/features/participant/api/applications"

type SimulatePaymentButtonProps = { applicationId: string; termId: string; amountCzk: number }

/**
 * Staging and demo only (US-115): records a simulated payment of the term's remaining debt. The
 * parent renders it only when the backend says `canSimulatePayment`.
 */
// Figma (Design system): US-115 / Detail přihlášky · Platby · simulace · Návrh A · simulace termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15954-1005 (360 px: node-id=15954-1133)
export function SimulatePaymentButton({
  applicationId,
  termId,
  amountCzk,
}: SimulatePaymentButtonProps) {
  const { t } = useTranslation("participant")
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => simulatePayment(applicationId, termId),
    onSuccess: () => client.invalidateQueries({ queryKey: ["participant", "applications"] }),
    onError: (error) => notify.error(error.message),
  })

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {t("payment.simulation.termAmount", { amount: formatCzk(amountCzk) })}
      </p>
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {t("payment.simulation.paid")}
      </Button>
    </div>
  )
}
