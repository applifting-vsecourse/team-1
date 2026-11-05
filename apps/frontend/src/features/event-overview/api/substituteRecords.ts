import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const personSchema = z.object({
  applicationId: z.string(),
  name: z.string(),
  /** Status in the term now, not when the record was written. */
  status: z.enum(["CONFIRMED", "WAITLISTED", "CANCELLED", "TO_EVALUATE"]),
})

/** System record of one confirmation from the waitlist (US-105). Read-only. */
export const substituteRecordSchema = z.object({
  id: z.string(),
  termId: z.string(),
  /** Queue of the confirmed one: their gender, or the one common queue. */
  group: z.enum(["FEMALE", "MALE", "SHARED"]),
  confirmed: personSchema,
  /** Waiting ahead of the confirmed one in the same queue, in order. */
  skipped: z.array(personSchema),
  /** Null: the system acted. */
  changedByName: z.string().nullable(),
  changedAt: z.string(),
})
export type SubstituteRecord = z.infer<typeof substituteRecordSchema>

export const substituteHistoryQueryOptions = (eventId: string, termId: string) =>
  queryOptions({
    queryKey: ["eventOverview", "substituteHistory", eventId, termId],
    queryFn: async () =>
      z
        .array(substituteRecordSchema)
        .parse(
          await api
            .get(
              `organizer/events/${encodeURIComponent(eventId)}/terms/${encodeURIComponent(termId)}/substitutes/history`,
            )
            .json(),
        ),
  })

/**
 * Whom a confirmation still passes over. Once the confirmed one is no longer confirmed (back on
 * the waitlist, cancelled), nobody is passed over any more; and a skipped one that has been
 * confirmed or cancelled since is no longer waiting behind them.
 */
export const stillSkipped = (record: SubstituteRecord) =>
  record.confirmed.status === "CONFIRMED"
    ? record.skipped.filter((person) => person.status === "WAITLISTED")
    : []

/**
 * Only the current confirmation of each person counts: confirmed, put back among the substitutes
 * and confirmed again leaves one record, the newest, not one per confirmation.
 */
export const currentRecords = (records: SubstituteRecord[]) => {
  const seen = new Set<string>()
  return [...records]
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    .filter((record) => {
      const key = `${record.termId}:${record.confirmed.applicationId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
