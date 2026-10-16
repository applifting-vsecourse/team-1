const czkFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
})

/** Amounts are whole crowns everywhere (see docs/PROJEKT.md, data model). */
export function formatCzk(amountCzk: number) {
  return czkFormatter.format(amountCzk)
}
