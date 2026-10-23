import { useMutation, useQueryClient } from "@tanstack/react-query"

import { eventKeys } from "@/features/events/api/events"
import { cancelTerm, createTerm, updateTerm, type TermInput } from "@/features/events/api/terms"

/** Terms change the event too (term count, dates, readiness of the link), so both refetch. */
function useRefreshEvent(eventId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
    ])
}

export function useCreateTerm(eventId: string) {
  const refresh = useRefreshEvent(eventId)
  return useMutation({
    mutationFn: (input: TermInput) => createTerm(eventId, input),
    onSuccess: refresh,
  })
}

export function useUpdateTerm(eventId: string, termId: string) {
  const refresh = useRefreshEvent(eventId)
  return useMutation({
    mutationFn: (input: TermInput) => updateTerm(eventId, termId, input),
    onSuccess: refresh,
  })
}

export function useCancelTerm(eventId: string, termId: string) {
  const refresh = useRefreshEvent(eventId)
  return useMutation({
    mutationFn: (reason: string) => cancelTerm(eventId, termId, reason),
    onSuccess: refresh,
  })
}
