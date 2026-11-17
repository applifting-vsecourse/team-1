import { z } from "zod"

import { api } from "@/lib/api-client"

export type ManualApplicationInput = {
  firstName: string
  lastName: string
  birthDate: string
  gender: "FEMALE" | "MALE"
  email: string
  phone: string
  consent: true
  terms: { termId: string; status: "CONFIRMED" | "WAITLISTED" }[]
  confirmOverCapacity?: boolean
}

const createdSchema = z.object({
  applicationId: z.string(),
  number: z.number().int(),
})

export async function createManualApplication(eventId: string, input: ManualApplicationInput) {
  return createdSchema.parse(
    await api
      .post(`organizer/events/${encodeURIComponent(eventId)}/applications`, { json: input })
      .json(),
  )
}
