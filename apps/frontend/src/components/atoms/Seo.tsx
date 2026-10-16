import { useEffect } from "react"

const DEFAULT_TITLE = "Togena"

type SeoProps = {
  title?: string
}

export function Seo({ title }: SeoProps) {
  useEffect(() => {
    document.title = title ? `${title} • ${DEFAULT_TITLE}` : DEFAULT_TITLE
  }, [title])
  return null
}
