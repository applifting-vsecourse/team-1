import { useState } from "react"
import { useTranslation } from "react-i18next"

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

/**
 * Account settings of every signed-in account: „Profil“ (name, e-mail), „Předvolby“
 * (language, theme) and „Zabezpečení“ (password). Signing out stays
 * in the account menu of the sidebar.
 */
// Figma (Design system v2): US-124 / Profil a jazyk · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19504-8672 (360 px: node-id=19504-8792)
// Figma (Design system v2): US-124 / Změnit heslo · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19504-9261 (360 px: node-id=19504-9400); US-125 / Změna e-mailu · node-id=22404-23993
export function AccountPage({ isEmailChanged = false }: { isEmailChanged?: boolean }) {
  const [isPointerFocus, setIsPointerFocus] = useState(false)
  useConnectionFeedback()
  const { t } = useTranslation("auth")
  const { user } = useSession()
  useEmailChangedNotice(isEmailChanged, user?.email)

  if (!user) return null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        hasBand
        title={t("account.title")}
        description={t("account.description")}
      />

      <Tabs
        defaultValue="profile"
        className="gap-6"
      >
        {/* Figma v2: Sekce účtu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=27081-144433 (mobile 19504-9405) */}
        <TabsList
          aria-label={t("account.title")}
          variant="line"
          data-pointer-focus={isPointerFocus || undefined}
          onPointerDownCapture={() => setIsPointerFocus(true)}
          onKeyDownCapture={() => setIsPointerFocus(false)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setIsPointerFocus(false)
          }}
          className="mx-auto w-[calc(100vw-36px)] max-w-full justify-start gap-2 p-0 group-data-[orientation=horizontal]/tabs:h-12 md:mx-0 md:w-full md:group-data-[orientation=horizontal]/tabs:h-15"
        >
          {SECTIONS.map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              className="account-tab h-full rounded-control border-0 p-3 text-base leading-6 font-normal transition-colors md:flex-none md:px-2 md:first:min-w-[63px] md:last:min-w-[122px]"
            >
              {t(`account.tabs.${key}`)}
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
