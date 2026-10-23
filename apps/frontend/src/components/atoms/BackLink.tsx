import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

/** "← Back to …" above a heading: DS / Button Style=Quiet without left padding, aligned with the title. */
export function BackLink({ children, ...props }: LinkProps & { children: ReactNode }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="lg"
      className="self-start px-0 hover:bg-transparent hover:underline dark:hover:bg-transparent"
    >
      <Link {...props}>{children}</Link>
    </Button>
  )
}
