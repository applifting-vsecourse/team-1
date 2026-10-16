import { formatCzk } from "@/lib/money"
import { cn } from "@/lib/utils"

type MoneyAmountProps = {
  amountCzk: number
  className?: string
}

/** A CZK amount, formatted the Czech way and kept on one line (`1 500 Kč`). */
export function MoneyAmount({ amountCzk, className }: MoneyAmountProps) {
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>{formatCzk(amountCzk)}</span>
  )
}
