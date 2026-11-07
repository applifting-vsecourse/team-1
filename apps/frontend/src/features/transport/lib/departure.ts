import { format } from "date-fns"

import { formatDate, formatTime } from "@/lib/date"

/** cs: `12. 7. 2027 v 08:00` — the day and the time of a departure, in the viewer's time zone. */
export function departureText(iso: string, atWord: string): string {
  return `${formatDate(iso)} ${atWord} ${formatTime(iso)}`
}

/** The value of a `datetime-local` field (`2027-07-12T08:00`) for an instant. */
export const toDateTimeLocal = (iso: string): string => format(new Date(iso), "yyyy-MM-dd'T'HH:mm")

/** The instant a `datetime-local` value means in the viewer's time zone; `null` when it is empty. */
export function fromDateTimeLocal(value: string): string | null {
  const date = new Date(value)
  return value === "" || Number.isNaN(date.getTime()) ? null : date.toISOString()
}
