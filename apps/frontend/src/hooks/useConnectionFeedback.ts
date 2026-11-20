import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { notify } from "@/lib/notify"

// Figma M18 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=26793-3566
export function useConnectionFeedback() {
  const { t } = useTranslation()
  useEffect(() => {
    let isPreviouslyOnline = navigator.onLine
    const handleChange = () => {
      const isOnline = navigator.onLine
      if (isOnline === isPreviouslyOnline) return
      isPreviouslyOnline = isOnline
      if (isOnline) notify.info(t("state.connectionRestored"), undefined, "network-connection")
      else notify.warning(t("state.offline"), undefined, "network-connection")
    }
    window.addEventListener("online", handleChange)
    window.addEventListener("offline", handleChange)
    return () => {
      window.removeEventListener("online", handleChange)
      window.removeEventListener("offline", handleChange)
    }
  }, [t])
}
