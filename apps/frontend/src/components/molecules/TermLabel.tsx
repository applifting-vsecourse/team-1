import { formatDateRange } from "@/lib/date"
import { termName } from "@/lib/term-label"
import { cn } from "@/lib/utils"

type TermLabelProps = {
  isProminent?: boolean
  /** Clamps a long name to two lines with the full text in a title; only where the full text is available elsewhere. */
  isClamped?: boolean
  term: { name: string | null; startsOn: string; endsOn: string }
}

/** A term in a list row: its dates with the year and, when it has one, its name underneath. */
// Figma (Design system): U / Term status row · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13884-219
export function TermLabel({ term, isProminent = false, isClamped = false }: TermLabelProps) {
  const name = termName(term)

  return (
    <span
      className={cn(
        "flex flex-1 flex-col",
        isProminent ? "gap-1" : "gap-0.5",
        isClamped && "min-w-0",
      )}
    >
      <span
        className={
          isProminent ? "text-lg/6.5 font-bold tabular-nums" : "text-sm font-medium tabular-nums"
        }
      >
        {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
      </span>
      {name ? (
        <>
          <span className="sr-only"> · </span>
          <span
            title={isClamped ? name : undefined}
            className={cn(
              isProminent
                ? "min-h-6.5 text-sm/5.5 text-muted-foreground"
                : "text-sm text-muted-foreground",
              isClamped && "line-clamp-2 wrap-anywhere",
            )}
          >
            {name}
          </span>
        </>
      ) : null}
    </span>
  )
}
