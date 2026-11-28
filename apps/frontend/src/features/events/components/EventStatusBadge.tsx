import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

/** Whether the event's application is open, in the event header and the contextual sidebar. */
export function EventStatusBadge({ isOpen }: { isOpen: boolean }) {
  const { t } = useTranslation("events")

  return (
    <Badge variant={isOpen ? "success" : "warning"}>
      {isOpen ? t("header.applicationsOpen") : t("list.statusClosed")}
    </Badge>
  )
}
