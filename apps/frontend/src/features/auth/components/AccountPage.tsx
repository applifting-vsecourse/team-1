import { useState } from "react"
import { useTranslation } from "react-i18next"

import { ActiveCorners } from "@/components/atoms/ActiveCorners"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm"
import { ProfileForm } from "@/features/auth/components/ProfileForm"
import { useSession } from "@/features/auth/hooks/useSession"

const SECTIONS = ["profile", "security"] as const
type Section = (typeof SECTIONS)[number]

/**
 * Account settings of every signed-in account: „Profil“ (name, language) and
 * „Zabezpečení“ (password). Changing the e-mail is US-125. Signing out stays
 * in the account menu of the sidebar.
 */
// Figma (Design system): US-124 / Nastavení účtu · Profil a jazyk · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2145
// Figma (Design system): US-124 / Nastavení účtu · Změnit heslo · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2424
export function AccountPage() {
  const { t } = useTranslation("auth")
  const { user } = useSession()
  const [section, setSection] = useState<Section>("profile")

  if (!user) return null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("account.title")}
        description={t("account.description")}
      />

      <Tabs
        value={section}
        onValueChange={(value) => setSection(value as Section)}
        className="gap-6"
      >
        <TabsList
          variant="line"
          className="h-auto w-full gap-2 p-0 md:w-fit"
        >
          {SECTIONS.map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              data-status={section === key ? "active" : undefined}
              className="group h-11 flex-1 rounded-md px-4 text-muted-foreground after:hidden hover:bg-accent/60 hover:text-foreground data-[state=active]:bg-accent data-[state=active]:text-foreground md:w-45 md:flex-none"
            >
              {t(`account.tabs.${key}`)}
              <ActiveCorners />
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {section === "profile" ? (
        <Card className="gap-4 p-4">
          <h2 className="text-2xl font-bold">{t("profile.title")}</h2>
          <ProfileForm user={user} />
        </Card>
      ) : (
        <Card className="gap-4 p-4">
          <h2 className="text-2xl font-bold">{t("changePassword.title")}</h2>
          <ChangePasswordForm />
        </Card>
      )}
    </div>
  )
}
