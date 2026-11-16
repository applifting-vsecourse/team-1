import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

type CharacterCounterProps = {
  count: number
  max: number
  id?: string
  className?: string
}

/** How much of a text limit is used: "120 / 2 000", in red once the limit is passed. */
export function CharacterCounter({ count, max, id, className }: CharacterCounterProps) {
  const { t, i18n } = useTranslation("common")
  const numbers = new Intl.NumberFormat(i18n.language)
  return (
    <span
      id={id}
      className={cn(
        "ml-auto text-xs tabular-nums",
        count > max ? "font-medium text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {t("characterCounter", { count: numbers.format(count), max: numbers.format(max) })}
    </span>
  )
}
