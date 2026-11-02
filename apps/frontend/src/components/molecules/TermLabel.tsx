import { formatDateRange } from "@/lib/date"
import { termName } from "@/lib/term-label"

type TermLabelProps = {
  term: { name: string | null; startsOn: string; endsOn: string }
}

/** A term in a list row: its dates with the year and, when it has one, its name underneath. */
// Figma (Design system): U / Term status row · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13884-219
export function TermLabel({ term }: TermLabelProps) {
  const name = termName(term)

  return (
    <span className="flex flex-1 flex-col gap-0.5">
      <span className="text-sm font-medium tabular-nums">
        {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
      </span>
      {name ? (
        <>
          <span className="sr-only"> · </span>
          <span className="text-sm text-muted-foreground">{name}</span>
        </>
      ) : null}
    </span>
  )
}
