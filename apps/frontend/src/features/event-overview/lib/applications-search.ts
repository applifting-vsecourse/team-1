import { z } from "zod"

/**
 * Filters of the applications list (US-52) that the occupancy counts link to:
 * a term, a status (also the queue to evaluate, US-103) and, with gendered rooms, a gender. The payment filter lists each payment state.
 */
export const applicationsSearchSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  term: z.string().optional(),
  status: z.enum(["TO_EVALUATE", "CONFIRMED", "WAITLISTED", "CANCELLED"]).optional(),
  gender: z.enum(["FEMALE", "MALE"]).optional(),
  payment: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"]).optional(),
})
export type ApplicationsSearch = z.infer<typeof applicationsSearchSchema>
