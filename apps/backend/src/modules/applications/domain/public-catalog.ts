import { PublicTerm } from "@/modules/applications/domain/public-event"

/** One card of the catalog: only what the Figma card shows (US-123). */
export type CatalogEvent = {
  /** The same token as in the application link `/apply/<publicToken>`. */
  publicToken: string
  name: string
  organizationId: string
  organizationName: string
  location: string | null
  /** ISO dates of every term, by start date (a card lists each term's dates). */
  terms: { name: string | null; startsOn: string; endsOn: string }[]
  termCount: number
  /** Lowest term price, whole CZK; null while the event has no term. */
  fromPriceCzk: number | null
  /** The application link works (docs/PROJEKT.md, section 5). */
  isOpenForApplications: boolean
}

export type CatalogOrganization = { id: string; name: string }

export type Catalog = {
  organizations: CatalogOrganization[]
  events: CatalogEvent[]
}

/** The shared event page at its permanent address (US-22); also opened from the catalog. */
export type CatalogEventDetail = {
  publicToken: string
  name: string
  organizationName: string
  description: string | null
  location: string | null
  contactEmail: string | null
  contactPhone: string | null
  terms: PublicTerm[]
  hasPhoto: boolean
}

/** Number of terms and the lowest price over them, as the card summarizes the event. */
export function summarizeTerms(terms: { priceCzk: number }[]): {
  termCount: number
  fromPriceCzk: number | null
} {
  return {
    termCount: terms.length,
    fromPriceCzk: terms.length === 0 ? null : Math.min(...terms.map((term) => term.priceCzk)),
  }
}

/** Organizations that have at least one of the listed events, in name order. */
export function organizationsOf(events: CatalogEvent[]): CatalogOrganization[] {
  const byId = new Map<string, CatalogOrganization>()
  for (const event of events) {
    byId.set(event.organizationId, { id: event.organizationId, name: event.organizationName })
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "cs"))
}
