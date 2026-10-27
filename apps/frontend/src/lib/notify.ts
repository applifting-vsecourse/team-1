import { toast } from "sonner"

/** Success and info toasts disappear after 4 s, warning and error after 8 s. */
export const TOAST_DURATION = { success: 4000, info: 4000, warning: 8000, error: 8000 } as const

type Tone = keyof typeof TOAST_DURATION

const show = (tone: Tone, title: string, description?: string) =>
  toast[tone](title, { description, duration: TOAST_DURATION[tone] })

/**
 * The one way to show a toast. Title = result of the action, description only when it adds
 * information. A toast has no buttons or links and never carries what the user needs for the
 * next step; a form that stays open shows its error in an Alert instead (DESIGN.md, Toasts).
 */
// Figma (Design system): DS / Toast · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14478-1651
export const notify = {
  success: (title: string, description?: string) => show("success", title, description),
  info: (title: string, description?: string) => show("info", title, description),
  warning: (title: string, description?: string) => show("warning", title, description),
  error: (title: string, description?: string) => show("error", title, description),
}
