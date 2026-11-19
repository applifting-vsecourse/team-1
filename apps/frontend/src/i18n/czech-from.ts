// Czech "z" becomes "ze" in front of a number whose spoken genitive starts with
// dv-, š-, s- or z-: "ze dvou", "ze šesti", "ze sedmi", "ze sta". The choice follows
// how the number is read, not how it is written, so it cannot be a plain suffix.
// Threes follow the acceptance criteria of #627 ("z 3"), see the PR.

// Numbers 12, 16, 17 start with dvanácti, šestnácti, sedmnácti.
const ZE_TEENS = new Set([12, 16, 17])
// Digits read as dvou/dva-, šesti/šest-, sedmi/sedm-; the same stems open 20, 60, 70 and
// the hundreds (200, 600, 700) — and 100 ("sta").
const ZE_DIGITS = new Set([2, 6, 7])

function startsWithZe(n: number): boolean {
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000)
    // 1000–1999 is read "z tisíce"; otherwise the count of thousands opens the phrase.
    return thousands === 1 ? false : startsWithZe(thousands)
  }
  const hundreds = Math.floor(n / 100)
  if (hundreds > 0) return hundreds === 1 || ZE_DIGITS.has(hundreds)
  const rest = n % 100
  if (rest >= 10 && rest < 20) return ZE_TEENS.has(rest)
  const units = rest % 10
  // 21–99 with units are read units first ("dvaadvaceti"), plain tens otherwise.
  return ZE_DIGITS.has(units > 0 ? units : rest / 10)
}

/**
 * "z 3" / "ze 2": the preposition "from" in front of a number, declined for Czech. A
 * non-breaking space keeps it on the line of its number.
 */
export function czechFrom(value: unknown): string {
  const n = Math.abs(Math.trunc(Number(value)))
  const preposition = Number.isFinite(n) && startsWithZe(n) ? "ze" : "z"
  return `${preposition}\u00A0${String(value)}`
}
