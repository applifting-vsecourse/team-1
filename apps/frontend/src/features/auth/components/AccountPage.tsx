import { useState } from "react"
import { useTranslation } from "react-i18next"

import { ActiveCorners } from "@/components/atoms/ActiveCorners"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useConnectionFeedback } from "@/hooks/useConnectionFeedback"

import { ChangeEmailSection } from "@/features/auth/components/ChangeEmailSection"
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm"
import { PreferencesCard } from "@/features/auth/components/PreferencesCard"
import { ProfileForm } from "@/features/auth/components/ProfileForm"
import { useEmailChangedNotice } from "@/features/auth/hooks/useEmailChangedNotice"
import { useSession } from "@/features/auth/hooks/useSession"

const SECTIONS = ["profile", "security"] as const
type Section = (typeof SECTIONS)[number]

/**
 * Account settings of every signed-in account: „Profil“ (name, e-mail), „Předvolby“
 * (language, theme) and „Zabezpečení“ (password). Signing out stays
 * in the account menu of the sidebar.
 */
// Figma (Design system v2): US-124 / Profil a jazyk · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19504-8672 (360 px: node-id=19504-8792)
// Figma (Design system v2): US-124 / Změnit heslo · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19504-9261 (360 px: node-id=19504-9400); US-125 / Změna e-mailu · node-id=22404-23993
export function AccountPage({ isEmailChanged = false }: { isEmailChanged?: boolean }) {
  useConnectionFeedback()
  const { t } = useTranslation("auth")
  const { user } = useSession()
  useEmailChangedNotice(isEmailChanged, user?.email)
  const [section, setSection] = useState<Section>("profile")

  if (!user) return null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        hasBand
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
        <TabsContent
          value="profile"
          className="mx-auto grid w-full max-w-[560px] gap-4"
        >
          <Card className="gap-4 p-4">
            <h2 className="text-2xl font-bold">{t("profile.title")}</h2>
            <ProfileForm user={user} />
          </Card>
          <PreferencesCard user={user} />
          <ChangeEmailSection user={user} />
        </TabsContent>
        <TabsContent
          value="security"
          className="mx-auto w-full max-w-[560px]"
        >
          <Card className="gap-4 p-4">
            <h2 className="text-2xl font-bold">{t("changePassword.title")}</h2>
            <ChangePasswordForm />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
