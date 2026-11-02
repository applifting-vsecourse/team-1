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
