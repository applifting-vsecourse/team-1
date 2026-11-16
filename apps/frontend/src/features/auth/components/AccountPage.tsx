import { useState } from "react"
import { useTranslation } from "react-i18next"

import { ActiveCorners } from "@/components/atoms/ActiveCorners"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ChangeEmailSection } from "@/features/auth/components/ChangeEmailSection"
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm"
import { PreferencesCard } from "@/features/auth/components/PreferencesCard"
import { ProfileForm } from "@/features/auth/components/ProfileForm"
import { useEmailChangedNotice } from "@/features/auth/hooks/useEmailChangedNotice"
import { useSession } from "@/features/auth/hooks/useSession"

const SECTIONS = ["profile", "preferences", "security"] as const
type Section = (typeof SECTIONS)[number]

/**
 * Account settings of every signed-in account: „Profil“ (name, e-mail), „Předvolby“
 * (language, theme) and „Zabezpečení“ (password). Signing out stays
 * in the account menu of the sidebar.
 */
// Figma (Design system): US-124 / Nastavení účtu · Profil a jazyk · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2145
// Figma (Design system): US-124 / Nastavení účtu · Změnit heslo · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2424
export function AccountPage({ isEmailChanged = false }: { isEmailChanged?: boolean }) {
  const { t } = useTranslation("auth")
  const { user } = useSession()
  useEmailChangedNotice(isEmailChanged, user?.email)
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
              // Togena / Tab: 60 px, no fill; the active label is the accent text colour
              // with the dot under it (and the logo corners), the inactive one is muted.
              className="group h-15 flex-1 rounded-sm px-2 text-muted-foreground after:hidden hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-link md:w-45 md:flex-none"
            >
              {t(`account.tabs.${key}`)}
              <span
                aria-hidden="true"
                className="absolute bottom-1 left-1/2 size-1.75 -translate-x-1/2 rounded-full bg-primary opacity-0 group-data-[state=active]:opacity-100"
              />
              <ActiveCorners />
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {section === "profile" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="gap-4 p-4">
            <h2 className="text-2xl font-bold">{t("profile.title")}</h2>
            <ProfileForm user={user} />
          </Card>
          <ChangeEmailSection user={user} />
        </div>
      ) : section === "preferences" ? (
        <PreferencesCard user={user} />
      ) : (
        <Card className="gap-4 p-4">
          <h2 className="text-2xl font-bold">{t("changePassword.title")}</h2>
          <ChangePasswordForm />
        </Card>
      )}
    </div>
  )
}
