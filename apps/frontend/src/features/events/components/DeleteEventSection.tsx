import { useState } from "react"
import { Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { SettingsCard } from "@/components/molecules/SettingsCard"
import { Button } from "@/components/ui/button"

import type { OrganizerEvent } from "@/features/events/api/events"
import { DeleteEventDialog } from "@/features/events/components/DeleteEventDialog"

/**
 * "Smazání akce" at the bottom of the event settings: a destructive button for an event
 * without applications (PM decision on #404: follows the frame), a quiet disabled one with
 * the reason written out once the event has applications (#315). The server still refuses
 * such an event (an application may arrive after the screen was loaded).
 */
// Figma (Design system): #315 Nastavení akce · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19798-37338
// Figma (Design system): #404 Dialog · potvrzení smazání (karta Smazání akce na pozadí) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22642-93349 (mobil 22642-93462)
// Figma (Design system): #404 Dialog · akci nelze smazat (karta Smazání akce na pozadí) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22642-93522 (mobil 22642-93635)
// Figma (Design system): #315 Nastavení · Akce bez přihlášek · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19798-37570
export function DeleteEventSection({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const [isOpen, setIsOpen] = useState(false)

  return (
    <SettingsCard
      icon={Trash2}
      tone="danger"
      title={t("delete.sectionTitle")}
      description={event.hasApplications ? t("delete.blocked") : t("delete.allowed")}
      descriptionId="delete-event-reason"
    >
      <Button
        variant="destructive"
        size="lg"
        className="w-full sm:w-fit"
        disabled={event.hasApplications}
        aria-describedby="delete-event-reason"
        onClick={() => setIsOpen(true)}
      >
        {t("delete.action")}
      </Button>
      {isOpen ? (
        <DeleteEventDialog
          event={event}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </SettingsCard>
  )
}
