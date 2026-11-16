import { useState } from "react"

export const PAGE_SIZE = 20

/**
 * Client-side paging of a list the API returns whole. The page resets to the first one when
 * `resetKey` changes (a filter, a search) and is clamped when the list shrinks.
 */
export function usePagination<T>(items: readonly T[], resetKey = "", pageSize = PAGE_SIZE) {
  const [state, setState] = useState({ page: 0, resetKey })
  // Adjusting state while rendering is the React way to reset it when an input changes.
  if (state.resetKey !== resetKey) setState({ page: 0, resetKey })

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(state.page, pageCount - 1)

  return {
    pageItems: items.slice(page * pageSize, (page + 1) * pageSize),
    page,
    pageCount,
    pageSize,
    total: items.length,
    setPage: (next: number) => setState({ page: next, resetKey }),
  }
}
