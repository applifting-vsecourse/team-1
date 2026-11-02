/** A `@db.Date` column as `2027-07-04`. */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10)
