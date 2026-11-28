import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"

import type { OrganizationContact as OrganizationContactData } from "@/features/participant/api/applications"
import { toTelHref } from "@/features/participant/lib/format"

type OrganizationContactProps = { contact: OrganizationContactData }

const linkClass =
  "-mx-1 w-fit p-1 wrap-anywhere underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

/** Who to call or write to about the event: the organization, its e-mail and phone. A missing line is left out; with neither e-mail nor phone a note says the contact isn't published (D-092). */
// Figma (Design system v2): Sekce · Kontakt organizace · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27649-35182 (360 px: 24910-14762)
// Figma (Design system v2): US-54 + US-121 / bez zveřejněného kontaktu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18783-627 (360 px: node-id=18783-775)
export function OrganizationContact({ contact }: OrganizationContactProps) {
  const { t } = useTranslation("participant")

  return (
    <section
      aria-labelledby="organization-contact"
      className="flex flex-col gap-3"
    >
      <h2
        id="organization-contact"
        className="text-xl font-semibold"
      >
        {t("contact.title")}
      </h2>
      <Card className="gap-1 p-4">
        <p className="font-semibold">{contact.name}</p>
        {!contact.email && !contact.phone ? (
          <p className="text-sm text-muted-foreground">{t("contact.none")}</p>
        ) : null}
        {contact.email && (
          <a
            className={`${linkClass} text-link`}
            href={`mailto:${contact.email}`}
          >
            {contact.email}
          </a>
        )}
        {contact.phone && (
          <a
            className={linkClass}
            href={toTelHref(contact.phone)}
          >
            {contact.phone}
          </a>
        )}
      </Card>
    </section>
  )
}
