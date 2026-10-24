import { z } from "zod"

/**
 * Filters of the applications list (US-52) that the occupancy counts link to:
 * a term, a status and, with gendered rooms, a gender.
 */
export const applicationsSearchSchema = z.object({
  term: z.string().optional(),
  status: z.enum(["CONFIRMED", "WAITLISTED"]).optional(),
  gender: z.enum(["FEMALE", "MALE"]).optional(),
})
export type ApplicationsSearch = z.infer<typeof applicationsSearchSchema>
