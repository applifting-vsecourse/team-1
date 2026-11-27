import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PaginationProps = {
  isCompact?: boolean
  page: number
  pageCount: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

/** At most this many page numbers are shown; the window slides with the current page. */
const VISIBLE_PAGES = 5
const NARROW_VISIBLE_PAGES = 3

const control = "h-11 shrink-0 rounded-md hover:bg-transparent hover:text-primary"
// Brand look A (Togena / Navigation / Pagination · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15285-9292):
// the arrows are ink-edged outline buttons that lift; the current page is ink-edged with the logo corners, r8.
const arrow = "h-11 w-10 shrink-0 rounded-md [&_svg]:size-6"

// Figma (Design system v2): Togena / Navigation / Pagination · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15270-7342
/** Range, arrows and page numbers; renders nothing when everything fits on one page. */
export function Pagination({
  isCompact = false,
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) {
  const { t } = useTranslation("common")
  if (pageCount <= 1) return null

  const firstVisible = (limit: number) =>
    Math.max(0, Math.min(page - Math.floor(limit / 2), pageCount - limit))
  const first = firstVisible(VISIBLE_PAGES)
  const narrowFirst = firstVisible(NARROW_VISIBLE_PAGES)
  const pages = Array.from({ length: Math.min(VISIBLE_PAGES, pageCount) }, (_, i) => first + i)

  return (
    <nav
      aria-label={t("pagination.label")}
      className={cn(
        "flex flex-col gap-2",
        isCompact && "@container/pagination",
        !isCompact && "md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-3",
      )}
    >
      <span className="text-sm text-muted-foreground">
        {t("pagination.range", {
          from: page * pageSize + 1,
          to: Math.min((page + 1) * pageSize, total),
          count: total,
        })}
      </span>
      <div className={cn("flex flex-wrap items-center gap-2", !isCompact && "md:justify-center")}>
        <Button
          type="button"
          variant="outline"
          className={arrow}
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
              "relative w-10 px-0 text-base font-normal",
              !isCompact && "md:w-12",
              isCompact &&
                (p < narrowFirst || p >= narrowFirst + NARROW_VISIBLE_PAGES) &&
                "hidden @min-[328px]/pagination:inline-flex",
              p === page && "border border-border-strong text-foreground",
            )}
            aria-label={t("pagination.page", { page: p + 1 })}
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p)}
          >
            {p + 1}
            {p === page && (
              <span
                aria-hidden="true"
                data-compact={isCompact || undefined}
                className="pagination-current-marker pointer-events-none absolute inset-0 bg-current mask-size-[100%_100%] text-primary"
              />
            )}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          className={arrow}
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
