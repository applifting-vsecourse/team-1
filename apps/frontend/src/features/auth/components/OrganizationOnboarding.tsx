import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { BrandDivider } from "@/components/atoms/BrandDivider"
import { PendingButton } from "@/components/atoms/PendingButton"
import { Seo } from "@/components/atoms/Seo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import {
  createOrganization,
  myOnboardingOrganizationsQueryOptions,
  organizationProfileQueryOptions,
  saveOrganizationProfile,
  type OrganizationProfile,
} from "@/features/auth/api/organizationOnboarding"
import { RegistrationLayout } from "@/features/auth/components/RegistrationLayout"

const bankAccountPattern = /^(?:\d{1,6}-)?\d{1,10}\/\d{4}$/

// Figma v2: Založit organizaci · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21238-10576
// Figma v2: Doplnit profil organizace · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21238-10700
// "Organizace je připravená" has no v2 frame; it keeps the US-69 layout.
export function OrganizationOnboarding() {
  const { t } = useTranslation("auth")
  const memberships = useQuery(myOnboardingOrganizationsQueryOptions())
  const [created, setCreated] = useState<OrganizationProfile | null>(null)
  const organizationId = created?.id ?? memberships.data?.[0]?.id
  const profileQuery = useQuery({
    ...organizationProfileQueryOptions(organizationId ?? ""),
    enabled: Boolean(organizationId) && !created,
  })
  const profile = created ?? profileQuery.data

  if (memberships.isPending || (organizationId && profileQuery.isPending && !created)) {
    return (
      <RegistrationLayout>
        <p>{t("registration.loading")}</p>
      </RegistrationLayout>
    )
  }
  if (memberships.error || profileQuery.error) {
    return (
      <RegistrationLayout>
        <Alert variant="destructive">
          <AlertDescription>{t("registration.loadFailed")}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => {
            void memberships.refetch()
            if (organizationId) void profileQuery.refetch()
          }}
        >
          {t("registration.retry")}
        </Button>
      </RegistrationLayout>
    )
  }
  if (!profile) return <CreateOrganizationForm onCreated={setCreated} />
  if (!profile.contactEmail || !profile.bankAccount) {
    return (
      <OrganizationProfileForm
        key={profile.id}
        profile={profile}
        onSaved={setCreated}
      />
    )
  }
  return <OrganizationReady profile={profile} />
}

function CreateOrganizationForm({
  onCreated,
}: {
  onCreated: (profile: OrganizationProfile) => void
}) {
  const { t } = useTranslation("auth")
  const [name, setName] = useState("")
  const [isSubmitted, setSubmitted] = useState(false)
  const [isPending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const queryClient = useQueryClient()
  // The route guard has loaded the session; its e-mail is the one just verified.
  const email = queryClient.getQueryData(authSessionQueryOptions().queryKey)?.user.email

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setFailure(null)
    if (!name.trim()) return
    setPending(true)
    try {
      const organization = await createOrganization(name.trim())
      queryClient.setQueryData(myOnboardingOrganizationsQueryOptions().queryKey, [
        { id: organization.id, name: organization.name },
      ])
      onCreated(organization)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : t("registration.failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <RegistrationLayout step="organizationStep">
      <Seo title={t("registration.createOrganizationTitle")} />
      <h1 className="text-2xl font-bold tracking-tight">
        {t("registration.createOrganizationTitle")}
      </h1>
      <BrandDivider />
      <Badge
        variant="success"
        className="self-start"
      >
        {t("registration.emailVerified")}
      </Badge>
      {email ? <p>{t("registration.organizationIntro", { email })}</p> : null}
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="organization-name"
            className="text-sm font-medium"
          >
            {t("registration.organizationName")}
          </label>
          <Input
            id="organization-name"
            className="h-12"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Lipno Events"
            aria-invalid={isSubmitted && !name.trim()}
          />
          {isSubmitted && !name.trim() ? (
            <p className="text-sm text-destructive">{t("registration.nameRequired")}</p>
          ) : null}
        </div>
        {failure ? (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}
        <PendingButton
          isPending={isPending}
          type="submit"
          size="lg"
          className="h-12 w-full"
        >
          {t("registration.createOrganization")}
        </PendingButton>
        <p className="text-muted-foreground">{t("registration.organizationNext")}</p>
      </form>
    </RegistrationLayout>
  )
}

function OrganizationProfileForm({
  profile,
  onSaved,
}: {
  profile: OrganizationProfile
  onSaved: (profile: OrganizationProfile) => void
}) {
  const { t } = useTranslation("auth")
  const [contactEmail, setContactEmail] = useState(profile.contactEmail ?? "")
  const [contactPhone, setContactPhone] = useState(profile.contactPhone ?? "")
  const [bankAccount, setBankAccount] = useState(profile.bankAccount)
  const [isSubmitted, setSubmitted] = useState(false)
  const [isPending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const isValidEmail = z.string().email().safeParse(contactEmail.trim()).success
  const isValidBank = bankAccountPattern.test(bankAccount.trim())

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setFailure(null)
    if (!isValidEmail || !isValidBank) return
    setPending(true)
    try {
      const saved = await saveOrganizationProfile(profile.id, {
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        bankAccount: bankAccount.trim(),
      })
      queryClient.setQueryData(organizationProfileQueryOptions(profile.id).queryKey, saved)
      onSaved(saved)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : t("registration.failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <RegistrationLayout step="profileStep">
      <Seo title={t("registration.profileTitle")} />
      <h1 className="text-2xl font-bold tracking-tight">{t("registration.profileTitle")}</h1>
      <BrandDivider />
      <Badge
        variant="success"
        className="self-start"
      >
        {t("registration.organizationCreated")}
      </Badge>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{t("registration.organization")}</p>
        <p>{profile.name}</p>
      </div>
      <p>{t("registration.profileIntro")}</p>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="organization-contact"
            className="text-sm font-medium"
          >
            {t("registration.contactEmail")}
          </label>
          <Input
            id="organization-contact"
            className="h-12"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="info@lipno.example.cz"
            aria-invalid={isSubmitted && !isValidEmail}
          />
          {isSubmitted && !isValidEmail ? (
            <p className="text-sm text-destructive">{t("registration.emailInvalid")}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="organization-phone"
            className="text-sm font-medium"
          >
            {t("registration.phone")}
          </label>
          <Input
            id="organization-phone"
            className="h-12"
            type="tel"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            placeholder="+420 777 123 456"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="organization-bank"
            className="text-sm font-medium"
          >
            {t("registration.bankAccount")}
          </label>
          <Input
            id="organization-bank"
            className="h-12"
            value={bankAccount}
            onChange={(event) => setBankAccount(event.target.value)}
            placeholder="2900123456/2010"
            aria-invalid={isSubmitted && !isValidBank}
          />
          {isSubmitted && !isValidBank ? (
            <p className="text-sm text-destructive">{t("registration.bankInvalid")}</p>
          ) : null}
        </div>
        {failure ? (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}
        <PendingButton
          isPending={isPending}
          type="submit"
          size="lg"
          className="h-12 w-full"
        >
          {t("registration.saveProfile")}
        </PendingButton>
      </form>
    </RegistrationLayout>
  )
}

function OrganizationReady({ profile }: { profile: OrganizationProfile }) {
  const { t } = useTranslation("auth")
  return (
    <RegistrationLayout step="profileStep">
      <Seo title={t("registration.readyTitle")} />
      <h1 className="text-2xl font-bold tracking-tight">{t("registration.readyTitle")}</h1>
      <BrandDivider />
      <Card className="gap-4 p-4 shadow-none">
        <h2 className="text-2xl font-bold tracking-tight">{profile.name}</h2>
        <p>{t("registration.readyDescription")}</p>
      </Card>
      <Button
        asChild
        size="lg"
        className="h-12 w-full"
      >
        <Link to={ROUTES.organizer.newEvent}>{t("registration.createFirstEvent")}</Link>
      </Button>
    </RegistrationLayout>
  )
}
