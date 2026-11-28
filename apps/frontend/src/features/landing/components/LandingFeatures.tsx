import { useTranslation } from "react-i18next"

import PaymentsIllustration from "@/assets/illustrations/payments.svg?react"
import RoomsIllustration from "@/assets/illustrations/rooms.svg?react"
import TermsIllustration from "@/assets/illustrations/terms.svg?react"
import WaitlistIllustration from "@/assets/illustrations/waitlist.svg?react"
import { Sticker } from "@/components/atoms/Sticker"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { LANDING_CONTENT } from "@/features/landing/lib/layout"

const FEATURES = [
  { key: "multiTerm", Illustration: TermsIllustration },
  { key: "capacity", Illustration: RoomsIllustration },
  { key: "payments", Illustration: PaymentsIllustration },
] as const

const STICKER_POSITION = "absolute top-[41%] left-[31%] -translate-1/2"

// Figma (Design system): Landing page / CZ / Desktop · Features · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-11198
// Figma (Design system): Landing page / CZ / Mobile · Features · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-11746
export function LandingFeatures() {
  const { t } = useTranslation("landing")

  return (
    <section
      id="organizers"
      className="scroll-mt-16 bg-muted py-8 md:py-16"
    >
      <div className={cn(LANDING_CONTENT, "flex flex-col gap-4 md:gap-10")}>
        <h2 className="text-center text-2xl font-semibold tracking-tight md:text-4xl/11 md:font-bold">
          {t("features.title")}
        </h2>
        <div className="flex flex-col gap-4 md:gap-6">
          <Card className="flex-col-reverse items-center gap-3 p-5 text-center md:flex-row md:gap-12 md:py-6 md:pr-8 md:pl-12 md:text-left">
            <div className="flex flex-col gap-3 md:flex-1 md:gap-2">
              <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                {t("features.waitlist.title")}
              </h3>
              <p className="text-muted-foreground">{t("features.waitlist.body")}</p>
            </div>
            <div
              aria-hidden
              className="relative w-full max-w-72 md:max-w-100"
            >
              <WaitlistIllustration className="h-auto w-full" />
              <Sticker
                label={t("preview.confirmed")}
                size="s"
                tilt="illustration"
                className={cn(STICKER_POSITION, "md:hidden")}
              />
              <Sticker
                label={t("preview.confirmed")}
                tilt="illustration"
                className={cn(STICKER_POSITION, "max-md:hidden")}
              />
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {FEATURES.map(({ key, Illustration }) => (
              <Card
                key={key}
                className="items-center gap-3 p-5 text-center md:gap-4 md:p-6"
              >
                <Illustration className="h-auto w-full max-w-60 md:max-w-67" />
                <h3 className="text-lg/6.5 font-semibold tracking-tight">
                  {t(`features.${key}.title`)}
                </h3>
                <p className="text-muted-foreground">{t(`features.${key}.body`)}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
