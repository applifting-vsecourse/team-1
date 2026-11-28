import { SlidersHorizontal, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/**
 * Below `lg`: the filter icon button next to the search opens a bottom sheet with the organization. The
 * choice applies at once (the sheet has no buttons); what is applied shows as a removable chip under
 * the toolbar.
 */
// Figma (Design system v2): F5 / Events / Spodní panel filtrů · Mobil · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15376-244 (component 27893-4836)
export function EventFiltersSheet({
  organizations,
  organizationId,
  onOrganizationChange,
  className,
}: {
  organizations: Map<string, string>
  organizationId: string
  onOrganizationChange: (organizationId: string) => void
  className?: string
}) {
  const { t } = useTranslation("events")
  const count = organizationId === "all" ? 0 : 1
  const options: [string, string][] = [
    ["all", t("list.organizationAll")],
    ...Array.from(organizations),
  ]

  return (
    <Sheet>
      <SheetTrigger asChild>
        {/* An icon button next to the search (Airbnb, Gmail on a phone): the status segment below then
            fits a 360 px row whole. The applied count is the orange count pill, like the bell's. */}
        <Button
          variant="outline"
          size="icon-lg"
          aria-label={count > 0 ? t("list.filtersCount", { count }) : t("list.filters")}
          className={cn("relative shrink-0", className)}
        >
          <SlidersHorizontal aria-hidden />
          {count > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-warm px-1.5 text-xs font-semibold text-brand-warm-foreground"
            >
              {count}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="max-h-[85dvh] gap-4 overflow-y-auto rounded-t-xl border-x-0 px-4 pt-4 pb-6"
      >
        <div className="flex items-center justify-between gap-2">
          <SheetTitle className="text-lg">{t("list.filters")}</SheetTitle>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={t("list.closeFilters")}
            >
              <X
                aria-hidden
                className="size-5"
              />
            </Button>
          </SheetClose>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-2 text-sm font-semibold">{t("list.organizationFilter")}</legend>
          <RadioGroup
            value={organizationId}
            onValueChange={onOrganizationChange}
            className="gap-0"
          >
            {options.map(([id, name]) => (
              <div
                key={id}
                className="flex min-h-11 items-center gap-3"
              >
                <RadioGroupItem
                  value={id}
                  id={`event-organization-${id}`}
                  className="size-5"
                />
                <Label
                  htmlFor={`event-organization-${id}`}
                  className="flex-1 py-2 text-base font-normal"
                >
                  {name}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>
      </SheetContent>
    </Sheet>
  )
}
