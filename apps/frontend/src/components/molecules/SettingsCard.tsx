import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"

/**
 * Card of one setting on the event settings page: heading, then the body
 * (usually a form whose save button sits inside the card).
 */
export function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="max-w-196 gap-4 p-4 sm:p-6">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </Card>
  )
}
