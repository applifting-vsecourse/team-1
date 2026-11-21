import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { Header } from "@/components/organisms/Header"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Public screens reached from a participant's access link. */
export function AccessCardLayout({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  const { t } = useTranslation("auth")
  return (
    <div className="flex min-h-svh flex-col">
      <Seo title={title} />
      <Header contentClassName="md:min-h-[115px]" />
      <main className="grid flex-1 place-items-center px-6 py-8">
        <Card
          className={cn(
            "w-full max-w-160 gap-4 rounded-2xl p-8 [--workspace-inset:0px]",
            className,
          )}
        >
          {children}
        </Card>
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground">{t("signature")}</footer>
    </div>
  )
}
