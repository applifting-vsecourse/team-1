import { formatDateRange } from "@/lib/date"

type TermLabelProps = {
  term: { name: string; startsOn: string; endsOn: string }
}

/** A term in a list row: its dates with the year and its name underneath. */
// Figma (Design system): U / Term status row · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13884-219
// Figma (Design system): O / Event term row · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13895-8174
export function TermLabel({ term }: TermLabelProps) {
  return (
    <span className="flex flex-1 flex-col">
      <span className="font-medium tabular-nums">
        {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
      </span>
      <span className="sr-only"> · </span>
      <span className="text-sm text-muted-foreground">{term.name}</span>
    </span>
  )
}
