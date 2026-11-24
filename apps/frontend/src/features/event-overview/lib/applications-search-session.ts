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
    return result.success ? withoutPage(result.data) : {}
  } catch {
    return {}
  }
}

/** The page is part of the URL only; the remembered filters never carry it. */
export function withoutPage(search: ApplicationsSearch): ApplicationsSearch {
  const { page: _page, ...filters } = search
  return filters
}

export function saveApplicationsSearch(eventId: string, fullSearch: ApplicationsSearch): void {
  const search = withoutPage(fullSearch)
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
