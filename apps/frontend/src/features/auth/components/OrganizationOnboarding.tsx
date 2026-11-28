import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import Camp from "@/assets/illustrations/camp.svg?react"
import { PendingButton } from "@/components/atoms/PendingButton"
import { Seo } from "@/components/atoms/Seo"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  createOrganization,
  myOnboardingOrganizationsQueryOptions,
  organizationProfileQueryOptions,
  saveOrganizationProfile,
  type OrganizationProfile,
} from "@/features/auth/api/organizationOnboarding"
import { RegistrationLayout } from "@/features/auth/components/RegistrationLayout"

const bankAccountPattern = /^(?:\d{1,6}-)?\d{1,10}\/\d{4}$/

// Figma (Design system v2): Registrace organizátora / Organizace · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27462-8916 (mobile 27462-8985)
// Figma (Design system v2): Registrace organizátora / Profil · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27462-9055 (mobile 27462-9133)
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
      <RegistrationLayout
        isSignedIn
        step={null}
      >
        <h1
          role="status"
          className="text-center text-2xl font-bold"
        >
          {t("registration.loading")}
        </h1>
      </RegistrationLayout>
    )
  }
  if (memberships.error || profileQuery.error) {
    return (
      <RegistrationLayout
        isSignedIn
        step={null}
      >
        <h1 className="text-center text-2xl font-bold">{t("registration.loadFailed")}</h1>
        <Button
          size="lg"
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
  return <OrganizationReady />
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
    <RegistrationLayout
      isSignedIn
      step="organizationStep"
    >
      <Seo title={t("registration.createOrganizationTitle")} />
      <h1 className="text-center text-2xl font-bold">
        {t("registration.createOrganizationTitle")}
      </h1>
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
            <TriangleAlert aria-hidden />
            <AlertTitle>{failure}</AlertTitle>
          </Alert>
        ) : null}
        <PendingButton
          isPending={isPending}
          type="submit"
          size="lg"
          className="w-full"
        >
          {t("registration.createOrganization")}
        </PendingButton>
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
    <RegistrationLayout
      isSignedIn
      step="profileStep"
    >
      <Seo title={t("registration.profileTitle")} />
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">{t("registration.profileTitle")}</h1>
        <p className="text-muted-foreground">{t("registration.profileIntro")}</p>
      </div>
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
            <TriangleAlert aria-hidden />
            <AlertTitle>{failure}</AlertTitle>
          </Alert>
        ) : null}
        <PendingButton
          isPending={isPending}
          type="submit"
          size="lg"
          className="w-full"
        >
          {t("registration.saveProfile")}
        </PendingButton>
      </form>
    </RegistrationLayout>
  )
}

// Figma (Design system v2): Registrace organizátora / Hotovo · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27462-9214 (mobile 27462-9282)
function OrganizationReady() {
  const { t } = useTranslation("auth")
  return (
    <RegistrationLayout
      isSignedIn
      step={null}
    >
      <Seo title={t("registration.readyTitle")} />
      <Camp className="h-24 w-32 self-center" />
      <h1 className="text-center text-2xl font-bold">{t("registration.readyTitle")}</h1>
      <Button
        asChild
        size="lg"
        className="w-full"
      >
        <Link to={ROUTES.organizer.newEvent}>{t("registration.createFirstEvent")}</Link>
      </Button>
    </RegistrationLayout>
  )
}
