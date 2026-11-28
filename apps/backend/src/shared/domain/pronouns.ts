export const MAX_PRONOUNS_LENGTH = 100

export function normalizePronouns(value: string | null | undefined): string | null {
  return value?.trim() || null
}
