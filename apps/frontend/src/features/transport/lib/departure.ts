import { format } from "date-fns"

import { formatDate, formatTime } from "@/lib/date"

/** cs: `12. 7. 2027 v 08:00` — the day and the time of a departure, in the viewer's time zone. */
export function departureText(iso: string, atWord: string): string {
  return `${formatDate(iso)} ${atWord} ${formatTime(iso)}`
}

/** An instant → the value of a date-and-time field (`2027-07-12T08:00`, viewer's time zone). */
export const toDateTimeValue = (iso: string): string => format(new Date(iso), "yyyy-MM-dd'T'HH:mm")

/** The instant a date-and-time value (`2027-07-12T08:00`) means in the viewer's time zone. */
export function fromDateTimeValue(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** The calendar day of a date-and-time value, for comparing with the end of a term. */
export const dayOf = (value: string): string => value.slice(0, 10)
