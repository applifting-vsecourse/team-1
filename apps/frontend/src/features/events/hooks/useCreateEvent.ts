import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createEvent, eventKeys } from "@/features/events/api/events"

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
  })
}
