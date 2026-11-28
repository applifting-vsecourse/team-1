import type { ReactNode } from "react"

import Loading from "@/assets/illustrations/loading.svg?react"
import Lost from "@/assets/illustrations/lost.svg?react"
import { useIsEmbeddedPage } from "@/components/atoms/EmbeddedPage"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { Header } from "@/components/organisms/Header"
import { PublicFooter } from "@/components/organisms/PublicFooter"

type Props = {
  title: string
  /** `lost` for a link that leads nowhere and a page you may not see, `error` for a failure. */
  illustration: "lost" | "error"
  /** One action; the participant 403 adds a quiet second one. */
  children: ReactNode
}

/**
 * 404, 403 and error pages: a brand illustration, a heading and one action — no sentence and no
 * code (Luma 404). Below an area layout only the content renders; on its own it gets the public
 * header without „Přihlásit se“ and the minimal footer.
 */
// Figma (Design system v2): Obecná 404 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20125-1914 (mobile 20125-1941); Něco se pokazilo 20125:1830 (mobile 20125:1865)
export function SystemPageLayout({ title, illustration, children }: Props) {
  const isEmbedded = useIsEmbeddedPage()
  const Illustration = illustration === "error" ? Loading : Lost
  const content = (
    <EmptyState
      titleAs="h1"
      title={title}
      illustration={<Illustration className="w-60" />}
      action={<div className="flex w-full flex-col items-center gap-3">{children}</div>}
      className="mx-auto w-full max-w-102 p-6"
    />
  )

  if (isEmbedded) return <div className="py-4 md:py-12">{content}</div>

  return (
    <div className="flex min-h-svh flex-col">
      <Seo title={title} />
      <Header
        hasSignIn={false}
        contentClassName="max-w-224"
      />
      <main className="flex-1 px-4 pt-8 pb-12 md:pt-20">{content}</main>
      <PublicFooter isMinimal />
    </div>
  )
}
