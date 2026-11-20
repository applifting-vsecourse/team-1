import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HTTPError, NetworkError, TimeoutError } from "ky"

import { PendingButton } from "@/components/atoms/PendingButton"

/** A timeout, lost response or server error can follow a committed write. */
export function hasUncertainOutcome(error: unknown): boolean {
  return (
    error instanceof NetworkError ||
    error instanceof TimeoutError ||
    (error instanceof HTTPError && (error.response.status >= 500 || error.response.status === 408))
  )
}

export function RefreshAfterWrite({
  label,
  onRefreshed,
}: {
  label: string
  onRefreshed: () => void
}) {
  const client = useQueryClient()
  const refresh = useMutation({
    mutationFn: () =>
      client.invalidateQueries(
        {
          queryKey: ["eventOverview"],
          predicate: (query) => query.queryKey[1] !== "correctionPreview",
        },
        { throwOnError: true },
      ),
    onSuccess: onRefreshed,
  })
  return (
    <div className="flex flex-col gap-2">
      {refresh.isError && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {refresh.error.message}
        </p>
      )}
      <PendingButton
        type="button"
        size="lg"
        isPending={refresh.isPending}
        onClick={() => refresh.mutate()}
      >
        {label}
      </PendingButton>
    </div>
  )
}
