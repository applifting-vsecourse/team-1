import type { ReactNode } from "react"

import financeMotif from "@/assets/headers/finance.svg"
import formsMotif from "@/assets/headers/forms.svg"
import planningMotif from "@/assets/headers/planning.svg"
import { cn } from "@/lib/utils"

const motifs = { finance: financeMotif, forms: formsMotif, planning: planningMotif }
export type HeadingMotif = keyof typeof motifs

// Figma v2: HF11 header and responsive band · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=23441-97050 (mobile 23445-99644)
export function HeadingBand({ children, motif }: { children: ReactNode; motif?: HeadingMotif }) {
  return (
    <div className="heading-band relative -mx-(--workspace-inset) px-(--workspace-inset) pb-11 md:pb-20">
      <div className={cn("relative z-10 min-w-0", motif && "md:pr-40")}>{children}</div>
      {motif ? (
        <img
          src={motifs[motif]}
          alt=""
          width={144}
          height={108}
          className="pointer-events-none absolute right-(--workspace-inset) bottom-3 hidden md:block"
        />
      ) : null}
    </div>
  )
}
