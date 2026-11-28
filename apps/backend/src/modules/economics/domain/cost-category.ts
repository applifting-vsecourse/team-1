import { Locale } from "@/core/email/locale"

export type CostCategoryKey =
  "VENUE" | "TRANSPORT" | "FOOD" | "STAFF" | "MATERIALS_AND_PROGRAMME" | "OTHER"

export type CostCategory = {
  id: string
  defaultKey: CostCategoryKey | null
  name: string | null
  position: number
}

// The order of the keys is the order an organization starts with (D-213).
const DEFAULT_NAMES: Record<CostCategoryKey, Record<Locale, string>> = {
  VENUE: { cs: "Prostory", en: "Venue" },
  TRANSPORT: { cs: "Doprava", en: "Transport" },
  FOOD: { cs: "Strava", en: "Food" },
  STAFF: { cs: "Lidé", en: "Staff" },
  MATERIALS_AND_PROGRAMME: { cs: "Materiál a program", en: "Program & Entertainment" },
  OTHER: { cs: "Ostatní", en: "Other" },
}

/** The categories every new organization gets. */
export const defaultCostCategories = (): { defaultKey: CostCategoryKey; position: number }[] =>
  (Object.keys(DEFAULT_NAMES) as CostCategoryKey[]).map((defaultKey, position) => ({
    defaultKey,
    position,
  }))

/** A name of its own is shown as written; a default category without one is translated. */
export const costCategoryName = (
  { name, defaultKey }: Pick<CostCategory, "name" | "defaultKey">,
  locale: Locale,
): string => name ?? (defaultKey ? DEFAULT_NAMES[defaultKey][locale] : "")
