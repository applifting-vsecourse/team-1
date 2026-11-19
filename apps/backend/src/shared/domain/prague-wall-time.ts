/**
 * Wall time of the Czech organizations, `yyyy-MM-ddTHH:mm` in Europe/Prague, stored as an
 * instant and read back as the same wall time, so day and hour never shift with a server zone.
 */
export const PRAGUE_TIME_ZONE = "Europe/Prague"

export const WALL_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

const zoneParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: PRAGUE_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

/** The wall time of an instant in Prague, `yyyy-MM-ddTHH:mm`. */
export function toPragueWallTime(instant: Date): string {
  const parts = Object.fromEntries(zoneParts.formatToParts(instant).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/** The instant of a Prague wall time; `null` when it is not a real day and time. */
export function fromPragueWallTime(wall: string): Date | null {
  if (!WALL_TIME_PATTERN.test(wall)) return null
  const asUtc = new Date(`${wall}:00Z`)
  if (Number.isNaN(asUtc.getTime()) || asUtc.toISOString().slice(0, 16) !== wall) return null
  // Prague is UTC+1 or UTC+2: pick the offset whose wall time is the one typed.
  for (const offsetHours of [1, 2]) {
    const candidate = new Date(asUtc.getTime() - offsetHours * 3_600_000)
    if (toPragueWallTime(candidate) === wall) return candidate
  }
  return null
}
