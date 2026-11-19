/** The most rooms one bulk create may make (in a gendered term the sum of both genders); the API enforces it too. */
export const BULK_ROOMS_MAX = 200
export const BULK_MAX_NUMBER = 999_999

/** `109, 110, 111, 120` → `109–111, 120`; at most `limit` groups, then an ellipsis. */
export function formatNumbers(names: string[], limit = 10): string {
  const groups: string[] = []
  let start = 0
  for (let index = 1; index <= names.length; index += 1) {
    const isRun = index < names.length && Number(names[index]) === Number(names[index - 1]) + 1
    if (isRun) continue
    groups.push(index - start > 1 ? `${names[start]}–${names[index - 1]}` : `${names[start]}`)
    start = index
  }
  return groups.length > limit ? `${groups.slice(0, limit).join(", ")}, …` : groups.join(", ")
}
