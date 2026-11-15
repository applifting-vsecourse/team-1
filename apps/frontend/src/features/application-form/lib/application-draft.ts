import { z } from "zod"

import {
  GENDERS,
  type ApplicationFormDraft,
} from "@/features/application-form/lib/application-form-schema"

// The unsent application survives a page reload. It lives in sessionStorage — gone when the tab
// closes, which matters on shared computers — under a key per application link, so two events
// never mix. The consent is never stored: the applicant confirms it on every submission.

const KEY_PREFIX = "togena:application-draft:"

const storedDraft = z.object({
  email: z.string(),
  participants: z
    .array(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        birthDate: z.string(),
        gender: z.enum(GENDERS).optional(),
        termIds: z.array(z.string()),
      }),
    )
    .min(1),
})

export const emptyApplicationDraft = (): ApplicationFormDraft => ({
  email: "",
  consent: false,
  participants: [{ firstName: "", lastName: "", birthDate: "", termIds: [] }],
})

const storageKey = (token: string) => `${KEY_PREFIX}${token}`

/** Storage is missing or throws in a private window or with blocked site data. */
function withStorage<T>(action: (storage: Storage) => T, fallback: T): T {
  try {
    return action(window.sessionStorage)
  } catch {
    return fallback
  }
}

const isEmpty = (draft: ApplicationFormDraft) =>
  draft.email === "" &&
  draft.participants.length === 1 &&
  draft.participants.every(
    (participant) =>
      participant.firstName === "" &&
      participant.lastName === "" &&
      participant.birthDate === "" &&
      participant.gender === undefined &&
      participant.termIds.length === 0,
  )

/** The saved draft with only the terms the event still offers, or `null` when there is none. */
export function loadApplicationDraft(
  token: string,
  termIds: readonly string[],
): ApplicationFormDraft | null {
  return withStorage((storage) => {
    const raw = storage.getItem(storageKey(token))
    if (raw === null) return null
    const parsed = storedDraft.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    return {
      email: parsed.data.email,
      consent: false,
      participants: parsed.data.participants.map((participant) => ({
        ...participant,
        termIds: participant.termIds.filter((id) => termIds.includes(id)),
      })),
    }
  }, null)
}

/** Stores the form as it is; an untouched form removes the entry instead. */
export function saveApplicationDraft(token: string, draft: ApplicationFormDraft): void {
  withStorage((storage) => {
    if (isEmpty(draft)) {
      storage.removeItem(storageKey(token))
      return
    }
    const { email, participants } = draft
    storage.setItem(storageKey(token), JSON.stringify({ email, participants }))
  }, undefined)
}

export function clearApplicationDraft(token: string): void {
  withStorage((storage) => storage.removeItem(storageKey(token)), undefined)
}
