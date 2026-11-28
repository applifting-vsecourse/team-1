import { useTranslation } from "react-i18next"

import { SidebarLink } from "@/components/atoms/SidebarLink"
import { cn } from "@/lib/utils"

import { EVENT_SECTION_GROUPS } from "@/features/events/lib/event-sections"

/**
 * The event's sections in their groups, a hairline between the groups and no group headings. The
 * current one is the nav A marker of the sidebar item (grey surface, Semi Bold, the orange bar).
 * `compact` is the contextual sidebar, `touch` the phone's bottom sheet.
 */
// Figma (Design system v2): F5 / Navigation / Sidebar organizátora · Kontext=Akce · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27890-4721
// Figma (Design system v2): F5 / Navigation / Spodní panel sekcí · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27892-4897
export function EventSectionLinks({
  eventId,
  size,
  onNavigate,
}: {
  eventId: string
  size: "compact" | "touch"
  onNavigate?: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2">
      {EVENT_SECTION_GROUPS.map((group) => (
        <ul
          key={group[0]!.key}
          className={cn(
            "flex flex-col gap-0.5 border-t border-sidebar-border pt-2",
            // In the sheet the title is above the first group, so no line there (Figma 27892:4897).
            size === "touch" && "first:border-t-0 first:pt-0",
          )}
        >
          {group.map(({ key, to, icon, isExact }) => (
            <li key={key}>
              <SidebarLink
                to={to}
                params={{ eventId }}
                icon={icon}
                size={size}
                activeOptions={isExact ? { exact: true } : undefined}
                onClick={onNavigate}
              >
                {t(`eventTabs.${key}`)}
              </SidebarLink>
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}
