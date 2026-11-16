import { describe, expect, it } from "vitest"

import type { Catalog, CatalogEvent } from "@/features/catalog/api/catalog"
import { eventsOf, knownOrganizationId } from "@/features/catalog/lib/catalog"

const event = (publicToken: string, organizationId: string): CatalogEvent => ({
  publicToken,
  name: publicToken,
  organizationId,
  organizationName: organizationId,
  location: null,
  terms: [],
  termCount: 0,
  fromPriceCzk: null,
  isOpenForApplications: false,
  hasPhoto: false,
})

const catalog: Catalog = {
  organizations: [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ],
  events: [event("1", "a"), event("2", "b"), event("3", "a")],
}

describe("eventsOf", () => {
  it("returns all events without an organization", () => {
    expect(eventsOf(catalog, undefined)).toHaveLength(3)
  })

  it("returns only the events of the organization", () => {
    expect(eventsOf(catalog, "a").map((e) => e.publicToken)).toEqual(["1", "3"])
  })
})

describe("knownOrganizationId", () => {
  it("keeps an organization of the catalog and drops any other", () => {
    expect(knownOrganizationId(catalog, "b")).toBe("b")
    expect(knownOrganizationId(catalog, "zzz")).toBeUndefined()
    expect(knownOrganizationId(catalog, undefined)).toBeUndefined()
  })
})
