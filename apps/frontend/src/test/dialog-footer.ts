import { screen } from "@testing-library/react"

/** Accessible names of the buttons in the open dialog's footer, in DOM order. */
export function footerButtonNames(): string[] {
  const footer = screen.getByRole("dialog").querySelector("[data-slot=dialog-footer]")
  if (!footer) throw new Error("The open dialog has no footer")
  return [...footer.querySelectorAll("button")].map((button) => button.textContent?.trim() ?? "")
}
