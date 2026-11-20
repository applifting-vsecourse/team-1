import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"

type Props = Omit<ComponentProps<typeof Button>, "asChild" | "aria-busy"> & { isPending: boolean }

// Figma v2: Feedback / Loader · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=15204-1294
export function PendingButton({
  isPending,
  disabled: isDisabled = false,
  children,
  ...props
}: Props) {
  return (
    <Button
      {...props}
      disabled={isPending || isDisabled}
      aria-busy={isPending}
    >
      {children}
      {isPending && (
        <span
          aria-hidden="true"
          className="submit-mark"
        >
          <span />
        </span>
      )}
    </Button>
  )
}
