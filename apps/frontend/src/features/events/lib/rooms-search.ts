import { z } from "zod"

/** The search params of the accommodation page. */
export const roomsSearchSchema = z.object({
  termId: z.string().optional().catch(undefined),
  /** The room assignment is the page itself; only the other views (US-36, #514) are named in the link. */
  view: z.enum(["overview", "requests"]).optional().catch(undefined),
  /** Page of the rooms (#728), 1-based; absent means the first. */
  page: z.coerce.number().int().min(1).max(10000).optional().catch(undefined),
})
export type RoomsSearch = z.infer<typeof roomsSearchSchema>

/** Another term starts on its first page. */
export const withTerm = (search: RoomsSearch, termId: string): RoomsSearch => ({
  ...search,
  termId,
  page: undefined,
})

/** `index` is 0-based, as the lists count pages. */
export const withPage = (search: RoomsSearch, index: number): RoomsSearch => ({
  ...search,
  page: index > 0 ? index + 1 : undefined,
})
