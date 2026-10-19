import { z } from "zod"

import { api } from "@/lib/api-client"

import type { ApplicationFormValues } from "@/features/application-form/lib/application-form-schema"

// The saving itself is US-27 (concurrency, evaluation); this is the contract
// the form sends to: `POST /api/public/events/:publicToken/applications`.
export const submittedApplicationSchema = z.object({
  /** Secret of the confirmation page `/apply/confirmation/:accessToken` (US-25). */
  accessToken: z.string(),
})
export type SubmittedApplication = z.infer<typeof submittedApplicationSchema>

export async function submitApplication(
  token: string,
  values: ApplicationFormValues,
): Promise<SubmittedApplication> {
  const response = await api
    .post(`public/events/${encodeURIComponent(token)}/applications`, { json: values })
    .json()
  return submittedApplicationSchema.parse(response)
}
