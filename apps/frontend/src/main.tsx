import { StrictMode } from "react"
import ReactDOM from "react-dom/client"

import "@/i18n"

import { installGlobalErrorHandlers } from "@/app/globalErrorHandlers"
import { Providers } from "@/app/Providers"
import { RootErrorBoundary } from "@/app/RootErrorBoundary"

const rootElement = document.getElementById("root")!

installGlobalErrorHandlers()

if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <RootErrorBoundary>
        <Providers />
      </RootErrorBoundary>
    </StrictMode>,
  )
}
