/**
 * True when one of the requested terms is already over: its last day (`endsOn`, an ISO date)
 * is before `today` (an ISO date in Prague). The last day itself still counts as running.
 */
export function hasEndedTerm(
  terms: { id: string; endsOn: string }[],
  requestedIds: string[],
  today: string,
): boolean {
  return terms.some(({ id, endsOn }) => requestedIds.includes(id) && endsOn < today)
}
