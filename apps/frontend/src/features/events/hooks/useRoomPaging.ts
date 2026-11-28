import { useEffect } from "react"

import { PAGE_SIZE, usePagination } from "@/hooks/usePagination"

/** The page of the rooms (0-based) kept by the caller, shared by both views of the accommodation. */
export type RoomPaging = {
  page: number
  onPageChange: (page: number, options?: { isReplace: boolean }) => void
}

/**
 * #728: one page of the rooms. Without `paging` the page is local state which a change of `resetKey`
 * sends back to the first one.
 */
export function useRoomPaging<T>({
  rooms,
  total,
  paging,
  resetKey,
}: {
  /** The rooms to page, e.g. the ones matching the search. */
  rooms: readonly T[]
  /** All rooms of the term; undefined until they are loaded and up to date. */
  total: number | undefined
  paging: RoomPaging | undefined
  resetKey?: string
}) {
  const result = usePagination(
    rooms,
    resetKey,
    PAGE_SIZE,
    paging && { page: paging.page, setPage: (next) => paging.onPageChange(next) },
  )
  // A page past the end (a deleted room, an old link) becomes the last one that exists. It is
  // judged by all rooms, so a search being typed never competes with its own reset.
  const lastPage = total === undefined ? undefined : Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)
  useEffect(() => {
    if (paging && lastPage !== undefined && paging.page > lastPage) {
      paging.onPageChange(lastPage, { isReplace: true })
    }
  })
  return result
}
