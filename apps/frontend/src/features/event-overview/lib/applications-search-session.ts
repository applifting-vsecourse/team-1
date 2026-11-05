import {
  applicationsSearchSchema,
  type ApplicationsSearch,
} from "@/features/event-overview/lib/applications-search"

const storageKey = (eventId: string) => `togena:applications-filters:${eventId}`

export function readApplicationsSearch(eventId: string): ApplicationsSearch {
  try {
    const stored = window.sessionStorage.getItem(storageKey(eventId))
    if (!stored) return {}
    const result = applicationsSearchSchema.safeParse(JSON.parse(stored))
    return result.success ? result.data : {}
  } catch {
    return {}
  }
}

export function saveApplicationsSearch(eventId: string, search: ApplicationsSearch): void {
  try {
    if (Object.values(search).some((value) => value !== undefined)) {
      window.sessionStorage.setItem(storageKey(eventId), JSON.stringify(search))
    } else {
      window.sessionStorage.removeItem(storageKey(eventId))
    }
  } catch {
    return
  }
}
