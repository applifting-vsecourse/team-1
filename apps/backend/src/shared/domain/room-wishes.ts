/** Most names a participant can wish to room with (US-146). */
export const MAX_ROOM_WISHES = 3

/** Longest single name; the wish is free text, so this only stops absurd input. */
export const MAX_ROOM_WISH_LENGTH = 100

/** Trims the names, drops the blank ones and repeats (ignoring case), keeps the first three. */
export function cleanRoomWishes(names: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, " ")
    const key = normalizeName(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(name)
  }
  return result.slice(0, MAX_ROOM_WISHES)
}

/** Lower case, no diacritics, single spaces: "  Eva  ČERNÁ " and "eva cerna" are the same name. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("cs")
    .trim()
    .replace(/\s+/g, " ")
}

export type RoomWish = { name: string; fulfilled: boolean }

/**
 * A wish is fulfilled when the person it names sleeps in the same room of the same term. The name is
 * free text, so it counts as a match when it equals a roommate's "first last" or "last first"
 * (ignoring case and diacritics). The participant's own name never fulfils their wish.
 */
export function evaluateRoomWishes(
  wishes: readonly string[],
  roommates: readonly { firstName: string; lastName: string }[],
): RoomWish[] {
  const names = new Set(
    roommates.flatMap(({ firstName, lastName }) => [
      normalizeName(`${firstName} ${lastName}`),
      normalizeName(`${lastName} ${firstName}`),
    ]),
  )
  return wishes.map((name) => ({ name, fulfilled: names.has(normalizeName(name)) }))
}
