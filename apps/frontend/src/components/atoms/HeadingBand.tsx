import type { ReactNode } from "react"

import MobileBand from "@/assets/headers/band-mobile.svg?react"
import DesktopBand from "@/assets/headers/band.svg?react"
import FinanceMotif from "@/assets/headers/finance.svg?react"
import FormsMotif from "@/assets/headers/forms.svg?react"
import PlanningMotif from "@/assets/headers/planning.svg?react"
import { cn } from "@/lib/utils"

const motifs = { finance: FinanceMotif, forms: FormsMotif, planning: PlanningMotif }
export type HeadingMotif = keyof typeof motifs

// Figma v2: HF11 header and responsive band · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=23441-97050 (mobile 23445-99644)
export function HeadingBand({ children, motif }: { children: ReactNode; motif?: HeadingMotif }) {
  const Motif = motif ? motifs[motif] : undefined
  return (
    <div className="relative -mx-(--workspace-inset) px-(--workspace-inset) pb-11 md:pb-20">
      <MobileBand
        aria-hidden
        focusable="false"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[30px] w-full md:hidden"
      />
      <DesktopBand
        aria-hidden
        focusable="false"
        className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[70px] w-full md:block"
      />
      <div className={cn("relative z-10 min-w-0", motif && "md:pr-40")}>{children}</div>
      {Motif ? (
        <Motif
          aria-hidden
          focusable="false"
          width={144}
          height={108}
          className="pointer-events-none absolute right-(--workspace-inset) bottom-3 hidden md:block"
        />
      ) : null}
    </div>
  )
}
