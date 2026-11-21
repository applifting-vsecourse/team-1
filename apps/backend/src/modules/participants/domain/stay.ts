import { fromPragueWallTime } from "@/shared/domain/prague-wall-time"

/**
 * Later arrival and earlier departure of a participant in a term (US-143, D-159). Only
 * information for the kitchen summary: nothing is computed from it.
 *
 * The participant types Prague wall time, `yyyy-MM-ddTHH:mm` (see `prague-wall-time`).
 */
export type StayInput = {
  /** Wall time `yyyy-MM-ddTHH:mm`, or `null` when not given. */
  lateArrival: string | null
  earlyDeparture: string | null
}

export type StayDecision =
  | { kind: "ok"; lateArrivalAt: Date | null; earlyDepartureAt: Date | null }
  | { kind: "invalid" }
  | { kind: "arrival_outside_term" }
  | { kind: "departure_outside_term" }
  | { kind: "departure_not_after_arrival" }

const isoDay = (date: Date): string => date.toISOString().slice(0, 10)

/** Checks the two values against the term's days (inclusive) and against each other. */
export function decideStay(input: StayInput, term: { startsOn: Date; endsOn: Date }): StayDecision {
  const arrival = input.lateArrival === null ? null : fromPragueWallTime(input.lateArrival)
  const departure = input.earlyDeparture === null ? null : fromPragueWallTime(input.earlyDeparture)
  if ((input.lateArrival !== null && !arrival) || (input.earlyDeparture !== null && !departure)) {
    return { kind: "invalid" }
  }
  const [first, last] = [isoDay(term.startsOn), isoDay(term.endsOn)]
  const outside = (wall: string) => wall.slice(0, 10) < first || wall.slice(0, 10) > last
  if (input.lateArrival !== null && outside(input.lateArrival)) {
    return { kind: "arrival_outside_term" }
  }
  if (input.earlyDeparture !== null && outside(input.earlyDeparture)) {
    return { kind: "departure_outside_term" }
  }
  if (arrival && departure && departure.getTime() <= arrival.getTime()) {
    return { kind: "departure_not_after_arrival" }
  }
  return { kind: "ok", lateArrivalAt: arrival, earlyDepartureAt: departure }
}
