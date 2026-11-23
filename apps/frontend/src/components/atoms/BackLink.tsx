import type { ComponentProps, ReactElement } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import backArrow from "@/assets/navigation/event-back-arrow.svg"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Figma v2: circular back navigation · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27316-3519
function BackControl({ label, children }: { label: string; children: ReactElement }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="ghost"
            size="icon-lg"
            className="min-h-11 max-w-11 min-w-11 flex-none self-start rounded-full bg-accent text-primary hover:bg-primary hover:text-primary-foreground dark:text-link dark:hover:bg-primary dark:hover:text-primary-foreground"
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={4}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function BackArrow({ label }: { label: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="size-5 bg-current mask-center mask-no-repeat"
        style={{ maskImage: `url("${backArrow}")` }}
      />
      <span className="sr-only">{label}</span>
    </>
  )
}

export function BackLink({
  children,
  ...props
}: Omit<LinkProps, "children"> & { children: string }) {
  return (
    <BackControl label={children}>
      <Link {...props}>
        <BackArrow label={children} />
      </Link>
    </BackControl>
  )
}

export function BackButton({
  children,
  ...props
}: Omit<ComponentProps<"button">, "children"> & { children: string }) {
  return (
    <BackControl label={children}>
      <button
        type="button"
        {...props}
      >
        <BackArrow label={children} />
      </button>
    </BackControl>
  )
}
