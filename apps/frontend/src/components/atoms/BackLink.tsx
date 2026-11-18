import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

/** "← Back to …" above a heading: DS / Button Style=Quiet without left padding, aligned with the title. */
export function BackLink({ children, ...props }: LinkProps & { children: ReactNode }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="lg"
      className="self-start rounded-full bg-accent px-4 text-link hover:bg-accent/80 has-[>svg]:px-4"
    >
      <Link {...props}>
        <ArrowLeft aria-hidden="true" />
        {children}
      </Link>
    </Button>
  )
}
