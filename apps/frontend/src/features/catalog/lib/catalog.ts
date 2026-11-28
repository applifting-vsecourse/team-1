import { formatDateRange, formatMonthRange } from "@/lib/date"

import type { Catalog, CatalogEvent } from "@/features/catalog/api/catalog"

/** The events of the chosen organization; without one, all of them. */
export function eventsOf(catalog: Catalog, organizationId: string | undefined): CatalogEvent[] {
  return organizationId
    ? catalog.events.filter((event) => event.organizationId === organizationId)
    : catalog.events
}

/** An organization that is not in the catalog (an old link) shows all events. */
export function knownOrganizationId(
  catalog: Catalog,
  organizationId: string | undefined,
): string | undefined {
  return catalog.organizations.some((organization) => organization.id === organizationId)
    ? organizationId
    : undefined
}

/**
 * The dates line of a card: the date range of a single term, otherwise the number of terms and
 * the months they span. `null` when the event has no term.
 */
export function eventDatesSummary(
  event: Pick<CatalogEvent, "terms">,
  countLabel: (count: number, months: string) => string,
): string | null {
  const terms = event.terms
  const first = terms[0]
  if (!first) return null
  if (terms.length === 1) {
    return formatDateRange(first.startsOn, first.endsOn, { shouldShowYear: true })
  }
  const lastEnd = terms.reduce(
    (latest, term) => (term.endsOn > latest ? term.endsOn : latest),
    first.endsOn,
  )
  return countLabel(terms.length, formatMonthRange(first.startsOn, lastEnd))
}

/** The lowest price of the terms of an event page — a single term has just its price. */
export function lowestPrice(terms: readonly { priceCzk: number }[]): number | null {
  return terms.length === 0 ? null : Math.min(...terms.map((term) => term.priceCzk))
}
