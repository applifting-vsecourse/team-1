import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"

import type { OrganizationContact as OrganizationContactData } from "@/features/participant/api/applications"
import { toTelHref } from "@/features/participant/lib/format"

type OrganizationContactProps = { contact: OrganizationContactData }

const linkClass = "w-fit p-1 text-link underline underline-offset-4"

/** Who to call or write to about the event: the organization, its e-mail and phone. A missing line is left out; with neither e-mail nor phone a note says the contact isn't published (D-092). */
// Figma (Design system): Detail přihlášky · Kontakt organizace u přihlášky, desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15649-211
// Figma (Design system): Detail přihlášky · Kontakt organizace u přihlášky, mobil 360 px · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15649-293
// Figma (Design system): Detail přihlášky · Kontakt organizace bez zveřejněného kontaktu, desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=18783-627
// Figma (Design system): Detail přihlášky · Kontakt organizace bez zveřejněného kontaktu, mobil 360 px · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=18783-775
export function OrganizationContact({ contact }: OrganizationContactProps) {
  const { t } = useTranslation("participant")

  return (
    <Card className="gap-2 p-4">
      <h2 className="text-2xl/8 font-bold tracking-tight">{t("contact.title")}</h2>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <p className="text-xl/7 font-bold tracking-tight md:flex-1">{contact.name}</p>
        {!contact.email && !contact.phone ? (
          <p className="text-sm text-muted-foreground md:flex-[2]">{t("contact.none")}</p>
        ) : null}
        {contact.email ? (
          <div className="flex min-w-0 flex-col gap-1 md:flex-1">
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
          <div className="flex min-w-0 flex-col gap-1 md:flex-1">
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
