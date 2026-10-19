const DAY_FIRST = /^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})$/
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * A date of birth as typed (Figma M02: `18. 5. 2014`) → ISO `2014-05-18`, or
 * `null` when it is not a real day. Day first, separated by dots, slashes or
 * dashes; a pasted ISO date is accepted too.
 */
export function parseBirthDate(text: string): string | null {
  const value = text.trim()
  const iso = ISO_DATE.exec(value)
  const dayFirst = DAY_FIRST.exec(value)
  const [year, month, day] = iso
    ? [iso[1], iso[2], iso[3]]
    : dayFirst
      ? [dayFirst[3], dayFirst[2], dayFirst[1]]
      : []
  if (!year || !month || !day) return null

  // `31. 2. 2014` matches the pattern but is not a day: the date rolls over.
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const isRealDay =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  return isRealDay ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : null
}
