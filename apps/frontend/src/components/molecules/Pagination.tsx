import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PaginationProps = {
  page: number
  pageCount: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

/** At most this many page numbers are shown; the window slides with the current page. */
const VISIBLE_PAGES = 5

const control = "h-11 shrink-0 hover:bg-transparent hover:text-primary"

// Figma (Design system v2): Togena / Navigation / Pagination · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15270-7342
/** Range, arrows and page numbers; renders nothing when everything fits on one page. */
export function Pagination({ page, pageCount, pageSize, total, onPageChange }: PaginationProps) {
  const { t } = useTranslation("common")
  if (pageCount <= 1) return null

  const first = Math.max(
    0,
    Math.min(page - Math.floor(VISIBLE_PAGES / 2), pageCount - VISIBLE_PAGES),
  )
  const pages = Array.from({ length: Math.min(VISIBLE_PAGES, pageCount) }, (_, i) => first + i)

  return (
    <nav
      aria-label={t("pagination.label")}
      className="flex flex-col gap-2 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-3"
    >
      <span className="text-sm text-muted-foreground">
        {t("pagination.range", {
          from: page * pageSize + 1,
          to: Math.min((page + 1) * pageSize, total),
          count: total,
        })}
      </span>
      <div className="flex flex-wrap items-center gap-2 md:justify-center">
        <Button
          type="button"
          variant="ghost"
          className={cn(control, "w-10 [&_svg]:size-6")}
          aria-label={t("pagination.previous")}
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ArrowLeftIcon
            aria-hidden="true"
            className="size-6"
          />
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            type="button"
            variant="ghost"
            className={cn(
              control,
              "relative w-10 px-0 text-base font-normal md:w-12",
              p === page && "text-primary",
            )}
            aria-label={t("pagination.page", { page: p + 1 })}
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p)}
          >
            {p + 1}
            {p === page && (
              <span
                aria-hidden="true"
                className="pagination-current-marker pointer-events-none absolute inset-0 bg-current mask-size-[100%_100%]"
              />
            )}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          className={cn(control, "w-10 [&_svg]:size-6")}
          aria-label={t("pagination.next")}
          disabled={page + 1 === pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ArrowRightIcon
            aria-hidden="true"
            className="size-6"
          />
        </Button>
      </div>
    </nav>
  )
}
