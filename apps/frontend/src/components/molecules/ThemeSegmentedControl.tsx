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
 * Light / dark / system as three icon segments. The chosen one is system B's selected segment, like
 * `ViewToggleGroup`: orange fill, ink icon and the ink edge (it is a control you act on).
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
          className="h-9.5 w-10 rounded-md border border-transparent px-0 text-foreground hover:bg-muted hover:text-foreground focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=on]:border-border-strong data-[state=on]:bg-brand-warm data-[state=on]:text-brand-warm-foreground"
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
