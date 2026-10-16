import { format, parseISO } from "date-fns"

type DateInput = string | number | Date

const toDate = (date: DateInput) => (typeof date === "string" ? parseISO(date) : date)

/** `7. 2. 2027` */
export function formatDate(date: DateInput) {
  return format(toDate(date), "d. M. yyyy")
}

/** `7. 2. 2027 20:00` */
export function formatDateTime(date: DateInput) {
  return format(toDate(date), "d. M. yyyy H:mm")
}
