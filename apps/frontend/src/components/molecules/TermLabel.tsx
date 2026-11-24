import { formatDateRange } from "@/lib/date"
import { termName } from "@/lib/term-label"

type TermLabelProps = {
  isProminent?: boolean
  term: { name: string | null; startsOn: string; endsOn: string }
}

/** A term in a list row: its dates with the year and, when it has one, its name underneath. */
// Figma (Design system): U / Term status row · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13884-219
export function TermLabel({ term, isProminent = false }: TermLabelProps) {
  const name = termName(term)

  return (
    <span
      className={
        isProminent ? "flex min-w-0 flex-1 flex-col gap-1" : "flex min-w-0 flex-1 flex-col gap-0.5"
      }
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
            title={name}
            className={
              isProminent
                ? "line-clamp-2 min-h-6.5 text-sm/5.5 wrap-anywhere text-muted-foreground"
                : "line-clamp-2 text-sm wrap-anywhere text-muted-foreground"
            }
          >
            {name}
          </span>
        </>
      ) : null}
    </span>
  )
}
