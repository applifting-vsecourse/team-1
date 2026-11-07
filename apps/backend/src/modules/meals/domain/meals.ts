export const MEAL_OPTION_NAME_MAX_LENGTH = 100
export const MEAL_OPTIONS_MAX = 20
export const ALLERGIES_MAX_LENGTH = 1000

export type MealOption = { id: string; name: string }

/** An option the organizer saves: an existing one keeps its `id`, a new one has none. */
export type MealOptionInput = { id?: string; name: string }

export type OptionsDecision =
  { kind: "ok"; options: { id?: string; name: string }[] } | { kind: "invalid" }

/** The organizer's list is replaced as a whole: names are trimmed, blank or repeated ones are refused. */
export function decideOptions(inputs: MealOptionInput[]): OptionsDecision {
  if (inputs.length > MEAL_OPTIONS_MAX) return { kind: "invalid" }
  const options = inputs.map((input) => ({ id: input.id, name: input.name.trim() }))
  const seen = new Set<string>()
  for (const option of options) {
    const key = option.name.toLocaleLowerCase()
    if (option.name === "" || option.name.length > MEAL_OPTION_NAME_MAX_LENGTH || seen.has(key)) {
      return { kind: "invalid" }
    }
    seen.add(key)
  }
  return { kind: "ok", options }
}

export type SelectionInput = { optionIds: string[]; allergies: string }

export type SelectionDecision =
  { kind: "ok"; optionIds: string[]; allergies: string | null } | { kind: "invalid" }

/** The participant ticks only options of the application's event; an empty text clears the allergies. */
export function decideSelection(input: SelectionInput, available: MealOption[]): SelectionDecision {
  const allowed = new Set(available.map((option) => option.id))
  const optionIds = [...new Set(input.optionIds)]
  if (optionIds.some((id) => !allowed.has(id))) return { kind: "invalid" }
  const allergies = input.allergies.trim()
  if (allergies.length > ALLERGIES_MAX_LENGTH) return { kind: "invalid" }
  return { kind: "ok", optionIds, allergies: allergies === "" ? null : allergies }
}

export type OwnMeals = {
  applicationId: string
  eventName: string
  firstName: string
  lastName: string
  options: MealOption[]
  selectedOptionIds: string[]
  allergies: string | null
}

export type KitchenPerson = {
  applicationId: string
  firstName: string
  lastName: string
  optionIds: string[]
  allergies: string | null
}

export type KitchenTermInput = {
  termId: string
  name: string | null
  startsOn: Date
  endsOn: Date
  /** Applications confirmed in the term. */
  people: KitchenPerson[]
}

export type KitchenTermSummary = {
  termId: string
  name: string | null
  startsOn: Date
  endsOn: Date
  total: number
  /** Confirmed participants without any ticked restriction. */
  regular: number
  /** Participants may tick several options, so the counts can overlap. */
  options: (MealOption & { count: number })[]
  allergies: { applicationId: string; firstName: string; lastName: string; allergies: string }[]
}

/** Counts for the kitchen per term — the one place that computes them. */
export function kitchenSummary(
  terms: KitchenTermInput[],
  options: MealOption[],
): KitchenTermSummary[] {
  return terms.map((term) => ({
    termId: term.termId,
    name: term.name,
    startsOn: term.startsOn,
    endsOn: term.endsOn,
    total: term.people.length,
    regular: term.people.filter((person) => person.optionIds.length === 0).length,
    options: options.map((option) => ({
      ...option,
      count: term.people.filter((person) => person.optionIds.includes(option.id)).length,
    })),
    allergies: term.people
      .filter(
        (person): person is KitchenPerson & { allergies: string } => person.allergies !== null,
      )
      .map(({ applicationId, firstName, lastName, allergies }) => ({
        applicationId,
        firstName,
        lastName,
        allergies,
      }))
      .sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName, "cs") ||
          a.firstName.localeCompare(b.firstName, "cs"),
      ),
  }))
}
