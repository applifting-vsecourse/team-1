import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const statusSchema = z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED", "ARCHIVED"])
const base = { id: z.string(), at: z.string(), author: z.string().nullable() }

export const EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "birthDate",
  "phone",
  "individualAccommodation",
  "accommodationRequest",
] as const

const historyEntrySchema = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("APPLICATION_CREATED") }),
  z.object({
    ...base,
    kind: z.literal("STATUS_CHANGE"),
    termName: z.string().nullable(),
    startsOn: z.string(),
    endsOn: z.string(),
    fromStatus: statusSchema,
    toStatus: statusSchema,
  }),
  z.object({
    ...base,
    kind: z.literal("EDIT"),
    /**
     * The changed details; a flag is the text `true` or `false`, an empty value is null. The
     * accommodation note comes without values: its history only says that it changed.
     */
    changes: z.array(
      z.object({
        field: z.enum(EDITABLE_FIELDS),
        from: z.string().nullable().optional(),
        to: z.string().nullable().optional(),
      }),
    ),
  }),
  z.object({
    ...base,
    kind: z.literal("LOGISTICS"),
    /** What the organizer wrote for the participant (D-191); never the text of the health note. */
    field: z.enum(["transport", "roomWishes", "stay", "health"]),
    termName: z.string().nullable().optional(),
    startsOn: z.string().optional(),
    endsOn: z.string().optional(),
    from: z.string().nullable().optional(),
    to: z.string().nullable().optional(),
  }),
  z.object({
    ...base,
    kind: z.literal("PAYMENT"),
    /** Total of the receipt in whole CZK; negative for a refund. */
    amountCzk: z.number().int(),
    isCorrection: z.boolean(),
    isCancelled: z.boolean(),
  }),
])
export type HistoryEntry = z.infer<typeof historyEntrySchema>

export const applicationHistoryQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: ["eventOverview", "applicationHistory", applicationId],
    queryFn: async () =>
      z
        .array(historyEntrySchema)
        .parse(
          await api
            .get(`organizer/applications/${encodeURIComponent(applicationId)}/history`)
            .json(),
        ),
  })
