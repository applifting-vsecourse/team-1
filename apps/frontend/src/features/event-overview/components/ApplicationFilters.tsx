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

import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

type FilterKey = "status" | "payment" | "term"
type FilterOption = {
  key: FilterKey
  label: string
  all: string
  values: { id: string; name: string }[]
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
      values: [
        { id: "CONFIRMED", name: t("applications.confirmed") },
        { id: "WAITLISTED", name: t("applications.waitlisted") },
        { id: "CANCELLED", name: t("applications.cancelled") },
      ],
    },
    {
      key: "payment",
      label: t("applications.payment"),
      all: t("applications.allPayments"),
      values: [
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
    return value
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
          size="lg"
          className="w-fit"
          onClick={() => onChange({})}
        >
          {t("applications.clear")}
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
  return options.map((option) => (
    <div
      key={option.key}
      className="flex min-w-0 flex-col gap-2 md:min-w-40"
    >
      <Label htmlFor={`${idPrefix}-filter-${option.key}`}>{option.label}</Label>
      <Select
        value={filters[option.key] ?? "all"}
        onValueChange={(value) =>
          onChange({ ...filters, [option.key]: value === "all" ? undefined : value })
        }
      >
        <SelectTrigger
          id={`${idPrefix}-filter-${option.key}`}
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
    </div>
  ))
}
