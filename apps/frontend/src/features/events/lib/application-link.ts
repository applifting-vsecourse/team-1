import { ROUTES } from "@/app/routes"

/** The public application link of an event, e.g. `https://togena.example/apply/<token>`. */
export function applicationLink(
  publicToken: string,
  origin: string = window.location.origin,
): string {
  return `${origin}${ROUTES.applicationForm.replace("$token", encodeURIComponent(publicToken))}`
}
