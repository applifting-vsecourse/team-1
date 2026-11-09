import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

type PaginationProps = {
  page: number
  pageCount: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

/** Previous / next with the shown range; renders nothing when everything fits on one page. */
export function Pagination({ page, pageCount, pageSize, total, onPageChange }: PaginationProps) {
  const { t } = useTranslation("common")
  if (pageCount <= 1) return null

  return (
    <nav
      aria-label={t("pagination.label")}
      className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center"
    >
      <Button
        variant="ghost"
        className="justify-self-start"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        {t("pagination.previous")}
      </Button>
      <span className="order-first col-span-2 text-center text-sm text-muted-foreground md:order-none md:col-span-1">
        {t("pagination.range", {
          from: page * pageSize + 1,
          to: Math.min((page + 1) * pageSize, total),
          count: total,
        })}
      </span>
      <Button
        variant="ghost"
        className="justify-self-end"
        disabled={page + 1 === pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        {t("pagination.next")}
      </Button>
    </nav>
  )
}
