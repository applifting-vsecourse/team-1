/**
 * How many items a long list shows before it folds the rest away (#732). One place decides the
 * counts for the application form and the event page; the components only ask.
 */
export const COMPACT_LIMITS = {
  /** Terms the applicant can tick in the form. */
  formSelection: 8,
  /** Terms in the event summary above the form. */
  formSummary: 3,
  /** Terms on the event page. */
  eventPage: 8,
} as const

/** Up to this many terms the form keeps its one-column choice of terms. */
export const FORM_SINGLE_COLUMN_TERMS = 4

/**
 * The first `limit` items and how many stay hidden. A single hidden item is never folded away:
 * "and 1 more term" takes the room of the term itself.
 */
export function compactList<T>(
  items: readonly T[],
  limit: number,
): { visible: T[]; hiddenCount: number } {
  const hiddenCount = items.length - limit
  if (hiddenCount < 2) return { visible: [...items], hiddenCount: 0 }
  return { visible: items.slice(0, limit), hiddenCount }
}
