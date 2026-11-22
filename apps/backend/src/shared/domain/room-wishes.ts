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
