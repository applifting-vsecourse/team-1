export const MEAL_OPTION_NAME_MAX_LENGTH = 100
export const MEAL_OPTIONS_MAX = 20
export const ALLERGIES_MAX_LENGTH = 1000
export const SPECIAL_REQUEST_MAX_LENGTH = 1000

/** Offered by every new event until the organizer changes the list. */
export const DEFAULT_MEAL_OPTION_NAMES = ["Vegetariánská", "Bezlepková"]

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

export type SelectionInput = {
  optionIds: string[]
  allergies: string
  specialRequest: string
  /** The participant confirms having no restriction (US-150); only valid with nothing entered. */
  noRestrictions?: boolean
}

export type SelectionDecision =
  | {
      kind: "ok"
      optionIds: string[]
      allergies: string | null
      specialRequest: string | null
      /** Stays set only while nothing is entered: a later restriction cancels the confirmation. */
      noRestrictions: boolean
    }
  | { kind: "invalid" }

/** The participant ticks only options of the application's event; an empty text clears the allergies. */
export function decideSelection(input: SelectionInput, available: MealOption[]): SelectionDecision {
  const allowed = new Set(available.map((option) => option.id))
  const optionIds = [...new Set(input.optionIds)]
  if (optionIds.some((id) => !allowed.has(id))) return { kind: "invalid" }
  const allergies = input.allergies.trim()
  const specialRequest = input.specialRequest.trim()
  if (allergies.length > ALLERGIES_MAX_LENGTH) return { kind: "invalid" }
  if (specialRequest.length > SPECIAL_REQUEST_MAX_LENGTH) return { kind: "invalid" }
  const hasRestriction = optionIds.length > 0 || allergies !== "" || specialRequest !== ""
  // Confirming "no restriction" together with an entered restriction contradicts itself.
  if (input.noRestrictions === true && hasRestriction) return { kind: "invalid" }
  return {
    kind: "ok",
    optionIds,
    allergies: allergies === "" ? null : allergies,
    specialRequest: specialRequest === "" ? null : specialRequest,
    noRestrictions: input.noRestrictions === true,
  }
}

export type OwnMeals = {
  applicationId: string
  eventName: string
  firstName: string
  lastName: string
  options: MealOption[]
  selectedOptionIds: string[]
  allergies: string | null
  specialRequest: string | null
  /** The participant confirmed having no meal restriction (US-150). */
  noRestrictions: boolean
  /** Until the last term that is not cancelled is over (D-192); the same for both roles. */
  editable: boolean
}

export type OrganizerMeals = OwnMeals

export type KitchenPerson = {
  applicationId: string
  firstName: string
  lastName: string
  optionIds: string[]
  allergies: string | null
  specialRequest: string | null
  /** The participant confirmed having no meal restriction (US-150). */
  noRestrictions: boolean
  /** Later arrival / earlier departure, Prague wall time `yyyy-MM-ddTHH:mm` (US-143). */
  lateArrival: string | null
  earlyDeparture: string | null
}

/** Something entered or "no restriction" confirmed — the participant has dealt with the step. */
export function isMealsDecided(person: {
  optionIds: string[]
  allergies: string | null
  specialRequest: string | null
  noRestrictions: boolean
}): boolean {
  return (
    person.noRestrictions ||
    person.optionIds.length > 0 ||
    person.allergies !== null ||
    person.specialRequest !== null
  )
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
  /** Confirmed participants without any ticked restriction (includes those who did not fill meals in). */
  regular: number
  /** Participants may tick several options, so the counts can overlap. */
  options: (MealOption & { count: number })[]
  allergies: { applicationId: string; firstName: string; lastName: string; allergies: string }[]
  specialRequests: {
    applicationId: string
    firstName: string
    lastName: string
    specialRequest: string
  }[]
  /** Participants who give a later arrival or an earlier departure; information only (US-143). */
  stays: {
    applicationId: string
    firstName: string
    lastName: string
    lateArrival: string | null
    earlyDeparture: string | null
  }[]
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
      .flatMap((person) =>
        person.allergies === null ? [] : [{ ...identify(person), allergies: person.allergies }],
      )
      .sort(byName),
    specialRequests: term.people
      .flatMap((person) =>
        person.specialRequest === null
          ? []
          : [{ ...identify(person), specialRequest: person.specialRequest }],
      )
      .sort(byName),
    stays: term.people
      .flatMap((person) =>
        person.lateArrival === null && person.earlyDeparture === null
          ? []
          : [
              {
                ...identify(person),
                lateArrival: person.lateArrival,
                earlyDeparture: person.earlyDeparture,
              },
            ],
      )
      .sort(byName),
  }))
}

function identify({ applicationId, firstName, lastName }: KitchenPerson) {
  return { applicationId, firstName, lastName }
}

function byName(
  a: { firstName: string; lastName: string },
  b: { firstName: string; lastName: string },
) {
  return a.lastName.localeCompare(b.lastName, "cs") || a.firstName.localeCompare(b.firstName, "cs")
}
