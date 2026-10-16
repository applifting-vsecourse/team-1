import { ErrorLayout } from "@/components/templates/ErrorLayout"
import { Button } from "@/components/ui/button"

type ErrorPageProps = {
  error: Error
}

export function ErrorPage({ error }: ErrorPageProps) {
  return (
    <ErrorLayout
      title="Něco se pokazilo"
      description={error.message || "Došlo k neočekávané chybě."}
      action={<Button onClick={() => window.location.reload()}>Načíst znovu</Button>}
    />
  )
}
