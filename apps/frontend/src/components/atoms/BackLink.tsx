import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Back navigation above a heading, using the secondary action treatment. */
export function BackLink({ children, ...props }: LinkProps & { children: ReactNode }) {
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className="max-w-full self-start whitespace-normal"
    >
      <Link {...props}>
        <ArrowLeft aria-hidden="true" />
        {children}
      </Link>
    </Button>
  )
}
