/** Gender as on the ID document; rooms are women's (FEMALE) or men's (MALE). */
export type Gender = "FEMALE" | "MALE"

export const GENDERS: readonly Gender[] = ["FEMALE", "MALE"]

/** A number per gender — capacity, confirmed, free places… */
export type GenderCounts = Record<Gender, number>

export const emptyGenderCounts = (): GenderCounts => ({ FEMALE: 0, MALE: 0 })
