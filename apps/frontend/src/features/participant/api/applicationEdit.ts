import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const entrySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  authorName: z.string(),
  changedFields: z.array(z.string()),
})

const editableApplicationSchema = z.object({
  id: z.string(),
  eventName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  birthDate: z.string(),
  phone: z.string().nullable(),
  accommodationRequest: z.string().nullable(),
  history: z.array(entrySchema),
})

export type EditableApplication = z.infer<typeof editableApplicationSchema>
export type EditApplicationInput = Pick<
  EditableApplication,
  "firstName" | "lastName" | "birthDate" | "phone" | "accommodationRequest"
>

export const applicationEditQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["participant", "applications", id, "edit"],
    queryFn: async (): Promise<EditableApplication> =>
      editableApplicationSchema.parse(
        await api.get(`participant/applications/${encodeURIComponent(id)}/edit`).json(),
      ),
  })

export async function saveApplicationEdit(
  id: string,
  input: EditApplicationInput,
): Promise<EditableApplication> {
  return editableApplicationSchema.parse(
    await api
      .put(`participant/applications/${encodeURIComponent(id)}/edit`, { json: input })
      .json(),
  )
}
