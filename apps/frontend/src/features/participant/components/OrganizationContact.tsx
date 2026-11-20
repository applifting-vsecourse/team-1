import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"

import type { OrganizationContact as OrganizationContactData } from "@/features/participant/api/applications"
import { toTelHref } from "@/features/participant/lib/format"

type OrganizationContactProps = { contact: OrganizationContactData }

const linkClass = "w-fit p-1 text-link underline underline-offset-4"

/** Who to call or write to about the event: the organization, its e-mail and phone. A missing line is left out; with neither e-mail nor phone a note says the contact isn't published (D-092). */
// Figma (Design system v2): US-121 / Kontakt organizace u přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19390-20928 (360 px: node-id=19390-21088)
// Figma (Design system v2): US-54 + US-121 / bez zveřejněného kontaktu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18783-627 (360 px: node-id=18783-775)
export function OrganizationContact({ contact }: OrganizationContactProps) {
  const { t } = useTranslation("participant")

  return (
    <Card className="gap-2 p-4">
      <h2 className="text-2xl/8 font-bold tracking-tight">{t("contact.title")}</h2>
      <div className="flex flex-col gap-3">
        <p className="text-xl/7 font-bold tracking-tight">{contact.name}</p>
        {!contact.email && !contact.phone ? (
          <p className="text-sm text-muted-foreground">{t("contact.none")}</p>
        ) : null}
        {contact.email ? (
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm text-muted-foreground">{t("contact.email")}</span>
            <a
              className={`${linkClass} break-all`}
              href={`mailto:${contact.email}`}
            >
              {contact.email}
            </a>
          </div>
        ) : null}
        {contact.phone ? (
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm text-muted-foreground">{t("contact.phone")}</span>
            <a
              className={linkClass}
              href={toTelHref(contact.phone)}
            >
              {contact.phone}
            </a>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
