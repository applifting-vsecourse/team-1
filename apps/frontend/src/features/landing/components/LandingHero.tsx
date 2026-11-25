import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import CampIllustration from "@/assets/illustrations/camp.svg?react"
import { Sticker } from "@/components/atoms/Sticker"
import { formatDateRange } from "@/lib/date"
import { cn } from "@/lib/utils"

import { LandingCtas } from "@/features/landing/components/LandingCtas"
import { LANDING_CONTENT } from "@/features/landing/lib/layout"

// M31 assembles the camp on the first load only, not when the visitor comes back to the landing.
let hasAssembled = false

/** The camp with a sample term that gets confirmed: decorative, the copy says the same. */
function HeroIllustration() {
  const { t } = useTranslation("landing")
  const [shouldAssemble] = useState(() => !hasAssembled)

  useEffect(() => {
    hasAssembled = true
  }, [])

  return (
    <div
      aria-hidden
      className={cn(
        "relative mx-auto w-full max-w-80 pb-14 lg:max-w-150 lg:pb-0",
        shouldAssemble && "brand-assemble",
      )}
    >
      <CampIllustration className="h-auto w-full" />
      <div className="absolute top-[95%] left-0 flex flex-col gap-0.5 rounded-lg border bg-card px-4 py-3 text-sm whitespace-nowrap shadow-sm lg:top-[83.5%] lg:left-[8%]">
        <span className="font-semibold">{t("preview.event")}</span>
        <span className="text-muted-foreground">
          {formatDateRange("2027-07-12", "2027-07-18", { shouldShowYear: true })}
        </span>
      </div>
      <Sticker
        label={t("preview.confirmed")}
        tilt="illustration"
        isAnimated={shouldAssemble}
        className="absolute top-[85%] left-[43%] -translate-1/2 lg:top-[78%] lg:left-[38%]"
      />
    </div>
  )
}

// Figma (Design system): Landing page / CZ / Desktop · Hero · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-10988
// Figma (Design system): Landing page / CZ / Mobile · Hero · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-11542
export function LandingHero() {
  const { t } = useTranslation("landing")

  return (
    <section
      className={cn(
        LANDING_CONTENT,
        "grid items-center gap-5 pt-8 pb-6 lg:grid-cols-[minmax(0,560px)_minmax(0,600px)] lg:justify-between lg:py-18",
      )}
    >
      <div className="flex flex-col gap-5 lg:gap-6">
        <h1 className="text-4xl/11 font-bold lg:text-6xl/16">
          {t("title")} <span className="brand-highlight">{t("titleAccent")}</span>
        </h1>
        <p className="text-muted-foreground md:text-lg">{t("description")}</p>
        <LandingCtas />
      </div>
      <HeroIllustration />
    </section>
  )
}
