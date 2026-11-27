import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"

import { redirectSignedIn } from "@/features/auth/lib/redirect-signed-in"
import { LandingClosing } from "@/features/landing/components/LandingClosing"
import { LandingFeatures } from "@/features/landing/components/LandingFeatures"
import { LandingHero } from "@/features/landing/components/LandingHero"

export const Route = createFileRoute("/")({
  // beforeLoad, not loader: a landing the router has already cached (visited signed out) would
  // otherwise render at once while the loader redirects, which is a visible flash of the landing.
  beforeLoad: ({ context }) => redirectSignedIn(context.queryClient),
  component: LandingPage,
})

// Landing of the product: hero with the two entries, what Togena does, closing with the same entries.
// Figma (Design system): Landing page / CZ / Desktop · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-10977
// Figma (Design system): Landing page / CZ / Mobile · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-11536
function LandingPage() {
  return (
    <>
      <Seo />
      <PublicLayout
        isFullWidth
        hasFullFooter
      >
        <LandingHero />
        <LandingFeatures />
        <LandingClosing />
      </PublicLayout>
    </>
  )
}
