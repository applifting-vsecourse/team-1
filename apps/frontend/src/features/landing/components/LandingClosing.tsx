import { useTranslation } from "react-i18next"

import CampIllustration from "@/assets/illustrations/camp.svg?react"
import { cn } from "@/lib/utils"

import { LandingCtas } from "@/features/landing/components/LandingCtas"
import { LANDING_CONTENT } from "@/features/landing/lib/layout"

// Figma (Design system): Landing page / CZ / Desktop · Závěr · CTA · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-11403
// Figma (Design system): Landing page / CZ / Mobile · Závěr · CTA · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-11945
export function LandingClosing() {
  const { t } = useTranslation("landing")

  return (
    <section
      className={cn(
        LANDING_CONTENT,
        "flex flex-col gap-5 py-8 md:flex-row md:items-center md:gap-16 md:py-16",
      )}
    >
      <div className="flex flex-col gap-5 md:flex-1 md:gap-6">
        <h2 className="text-2xl font-semibold md:text-4xl/11 md:font-bold">{t("cta.title")}</h2>
        <LandingCtas />
      </div>
      <CampIllustration className="mx-auto h-auto w-full max-w-72 shrink-0 md:max-w-100" />
    </section>
  )
}
