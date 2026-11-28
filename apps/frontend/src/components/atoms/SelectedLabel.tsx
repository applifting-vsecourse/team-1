import { Children, type ReactNode } from "react"

/**
 * Text of a selected-capable tab or segment. The selected state is Semi Bold (nav A), so an invisible bold
 * copy of the label reserves the wider width and selecting never shifts the neighbours.
 */
export function SelectedLabel({ children }: { children?: ReactNode }) {
  return Children.map(children, (child) =>
    typeof child === "string" ? (
      <span
        data-label={child}
        className="inline-flex flex-col items-center after:invisible after:block after:h-0 after:overflow-hidden after:font-semibold after:content-[attr(data-label)]"
      >
        {child}
      </span>
    ) : (
      child
    ),
  )
}
