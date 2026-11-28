import BackdropMobile from "@/assets/illustrations/backdrop-mobile.svg?react"
import BackdropDesktop from "@/assets/illustrations/backdrop.svg?react"

/**
 * The brand signature behind the card of an entry page (sign-in, magic link, set password,
 * registration): the arcs, discs and sun of the landing hero, the way Stripe repeats its landing
 * signature behind the sign-in card. Decorative; put it first inside a `relative` wrapper.
 */
// Figma (Design system v2): Togena / Brand / Backdrop · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27450-3707
export function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <BackdropMobile
        preserveAspectRatio="xMidYMin slice"
        className="size-full md:hidden"
      />
      <BackdropDesktop
        preserveAspectRatio="xMidYMin slice"
        className="hidden size-full md:block"
      />
    </div>
  )
}
