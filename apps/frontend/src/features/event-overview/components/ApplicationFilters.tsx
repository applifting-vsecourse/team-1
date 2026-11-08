import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

type FilterKey = "status" | "waitlist" | "payment" | "term"
type FilterOption = {
  key: FilterKey
  label: string
  all: string
  values: { id: string; name: string }[]
  /** Fixed by the chosen view (waitlist, queue): another value would find nothing. */
  isLocked?: boolean
}

// Figma (Design system): M12 / M12a · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14182-3993
export function ApplicationFilters({
  filters,
  terms,
  onChange,
}: {
  filters: ApplicationsSearch
  terms: { id: string; name: string }[]
  onChange: (filters: ApplicationsSearch) => void
}) {
  const { t } = useTranslation("eventOverview")
  const [isOpen, setIsOpen] = useState(false)
  useEffect(() => {
    if (!window.matchMedia) return
    const desktop = window.matchMedia("(min-width: 768px)")
    const closeOnDesktop = () => {
      if (desktop.matches) setIsOpen(false)
    }
    desktop.addEventListener("change", closeOnDesktop)
    return () => desktop.removeEventListener("change", closeOnDesktop)
  }, [])
  const options: FilterOption[] = [
    {
      key: "status",
      label: t("applications.status"),
      all: t("applications.allStatuses"),
      isLocked: filters.status === "TO_EVALUATE" || filters.status === "WAITLISTED",
      values: [
        { id: "TO_EVALUATE", name: t("applications.toEvaluate") },
        { id: "CONFIRMED", name: t("applications.confirmed") },
        { id: "WAITLISTED", name: t("applications.waitlisted") },
        { id: "CANCELLED", name: t("applications.cancelled") },
      ],
    },
    // Only in the waitlist view; the card "Náhradníci k vyřešení" opens it set to a free bed.
    ...(filters.status === "WAITLISTED"
      ? [
          {
            key: "waitlist" as const,
            label: t("applications.waitlistFilter"),
            all: t("applications.allWaitlisted"),
            values: [{ id: "FREE_BED", name: t("applications.waitlistFreeBed") }],
          },
        ]
      : []),
    {
      key: "payment",
      label: t("applications.payment"),
      all: t("applications.allPayments"),
      values: [
        { id: "DEBT", name: t("applications.debt") },
        { id: "NOTHING_DUE", name: t("applications.nothingDue") },
        { id: "UNPAID", name: t("applications.unpaid") },
        { id: "PARTIALLY_PAID", name: t("applications.partial") },
        { id: "PAID", name: t("applications.paid") },
        { id: "OVERPAID", name: t("applications.overpaid") },
      ],
    },
    { key: "term", label: t("applications.term"), all: t("applications.allTerms"), values: terms },
  ]
  const active = options.flatMap((option) => {
    const value = filters[option.key]
    // A locked filter is part of the view, not something to remove.
    return value && !option.isLocked
      ? [
          {
            key: option.key,
            name: option.values.find((item) => item.id === value)?.name ?? option.label,
          },
        ]
      : []
  })
  const gender = filters.gender
    ? t(filters.gender === "FEMALE" ? "applications.female" : "applications.male")
    : undefined
  const activeCount = active.length + (gender ? 1 : 0)
  const hasFilters = Object.values(filters).some(Boolean)
  const remove = (key: keyof ApplicationsSearch) => {
    const next = { ...filters }
    delete next[key]
    onChange(next)
  }
  const chip = (key: keyof ApplicationsSearch, name: string, className?: string) => (
    <Button
      key={key}
      variant="outline"
      size="lg"
      className={className}
      aria-label={t("applications.removeFilter", { filter: name })}
      onClick={() => remove(key)}
    >
      <span className="min-w-0 text-left break-words whitespace-normal">{name}</span>
      <X
        className="size-4 shrink-0"
        aria-hidden="true"
      />
    </Button>
  )
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto md:max-w-full md:flex-row md:flex-wrap md:items-end">
      <div className="hidden flex-wrap gap-2 md:flex">
        <FilterFields
          options={options}
          filters={filters}
          onChange={onChange}
          idPrefix="desktop"
        />
      </div>
      <Sheet
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="w-fit md:hidden"
          >
            {t("applications.filters")}
            {activeCount > 0 ? ` · ${activeCount}` : ""}
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-dvh gap-6 overflow-y-auto px-4 py-6"
        >
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{t("applications.filters")}</SheetTitle>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={t("applications.closeFilters")}
              >
                <X
                  className="size-5"
                  aria-hidden="true"
                />
              </Button>
            </SheetClose>
          </div>
          <SheetDescription>{t("applications.filtersImmediate")}</SheetDescription>
          <FilterFields
            options={options}
            filters={filters}
            onChange={onChange}
            idPrefix="mobile"
          />
          <Button
            variant="ghost"
            size="lg"
            disabled={!hasFilters}
            onClick={() => onChange({})}
          >
            {t("applications.clear")}
          </Button>
          <SheetClose asChild>
            <Button size="lg">{t("applications.showApplications")}</Button>
          </SheetClose>
        </SheetContent>
      </Sheet>
      {activeCount > 0 && (
        <div
          className="flex flex-wrap gap-2 md:hidden"
          role="group"
          aria-label={t("applications.activeFilters")}
        >
          {active.map((filter) => chip(filter.key, filter.name, "h-auto min-h-11 max-w-full"))}
          {gender && chip("gender", gender)}
        </div>
      )}
      {gender && chip("gender", gender, "hidden md:inline-flex")}
      {hasFilters && (
        <Button
          variant="ghost"
          size="icon-lg"
          className="shrink-0"
          aria-label={t("applications.clear")}
          title={t("applications.clear")}
          onClick={() => onChange({})}
        >
          <X
            className="size-5"
            aria-hidden="true"
          />
        </Button>
      )}
    </div>
  )
}

function FilterFields({
  options,
  filters,
  onChange,
  idPrefix,
}: {
  options: FilterOption[]
  filters: ApplicationsSearch
  onChange: (filters: ApplicationsSearch) => void
  idPrefix: string
}) {
  const { t } = useTranslation("eventOverview")
  return options.map((option) => {
    const select = (
      <Select
        value={filters[option.key] ?? "all"}
        onValueChange={(value) =>
          onChange({
            ...filters,
            [option.key]: value === "all" ? undefined : value,
            // A changed status leaves the free-bed filter of the overview card (it fits waitlisted only).
            ...(option.key === "status" ? { waitlist: undefined } : {}),
          })
        }
      >
        <SelectTrigger
          id={`${idPrefix}-filter-${option.key}`}
          disabled={option.isLocked}
          aria-describedby={option.isLocked ? `${idPrefix}-filter-${option.key}-locked` : undefined}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{option.all}</SelectItem>
          {option.values.map((value) => (
            <SelectItem
              key={value.id}
              value={value.id}
            >
              {value.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
    return (
      <div
        key={option.key}
        className={cn(
          "flex min-w-0 flex-col gap-2 md:w-56",
          // Wide enough for the whole value ("Náhradníci s volným lůžkem", a date range) on one line.
          option.key === "waitlist" && "md:w-60",
          option.key === "payment" && "md:w-48",
        )}
      >
        <Label htmlFor={`${idPrefix}-filter-${option.key}`}>{option.label}</Label>
        {option.isLocked ? (
          // A disabled control gets no pointer events, so the tooltip hangs on a wrapper.
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block">{select}</span>
              </TooltipTrigger>
              <TooltipContent>{t("applications.statusLocked")}</TooltipContent>
            </Tooltip>
            <span
              id={`${idPrefix}-filter-${option.key}-locked`}
              className="sr-only"
            >
              {t("applications.statusLocked")}
            </span>
          </TooltipProvider>
        ) : (
          select
        )}
      </div>
    )
  })
}
