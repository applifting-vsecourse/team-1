import { Monitor, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useTheme } from "@/hooks/useTheme"

const MODES = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const

/**
 * Light / dark / system as three icon segments. The chosen one is the nav A marker, like
 * `ViewToggleGroup`: nav-active surface, ink icon and a 12 × 3 px orange underline.
 */
// Figma (Design system v2): Togena / Navigation / Theme segmented control · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27609-4327
export function ThemeSegmentedControl({ labelledBy }: { labelledBy?: string }) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const mode = theme === "light" || theme === "dark" ? theme : "system"

  return (
    <ToggleGroup
      type="single"
      value={mode}
      // Radix sends "" when the chosen segment is pressed again; the theme always has a value.
      onValueChange={(value) => {
        if (value) setTheme(value)
      }}
      aria-labelledby={labelledBy}
      spacing={0.5}
      className="rounded-control border border-border-strong bg-card p-0.5"
    >
      {MODES.map(({ value, icon: Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={t(`theme.${value}`)}
          className="relative size-11 rounded-md border border-transparent px-0 text-foreground hover:bg-muted hover:text-foreground focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=on]:bg-nav-active data-[state=on]:text-foreground data-[state=on]:after:absolute data-[state=on]:after:bottom-0.5 data-[state=on]:after:left-1/2 data-[state=on]:after:h-0.75 data-[state=on]:after:w-3 data-[state=on]:after:-translate-x-1/2 data-[state=on]:after:rounded-full data-[state=on]:after:bg-nav-indicator data-[state=on]:after:content-['']"
        >
          <Icon
            aria-hidden
            className="size-5"
          />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
