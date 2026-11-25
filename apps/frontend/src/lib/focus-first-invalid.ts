const INVALID_CONTROL = '[aria-invalid="true"]:not([aria-hidden="true"]):not([tabindex="-1"])'

/**
 * Moves the view to the first control of the form marked invalid and focuses it, so a screen reader
 * reads the field and its error (linked through aria-describedby). The field's item is scrolled into
 * view, not the bare control, so its label stays visible; the sticky header is cleared by the item's
 * scroll margin. Returns whether there was an invalid control.
 */
export function focusFirstInvalidField(form: HTMLElement): boolean {
  const control = form.querySelector<HTMLElement>(INVALID_CONTROL)
  if (!control) return false
  control.focus({ preventScroll: true })
  const isReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const target = control.closest<HTMLElement>("[data-slot=form-item]") ?? control
  target.scrollIntoView({ block: "nearest", behavior: isReducedMotion ? "auto" : "smooth" })
  return true
}
