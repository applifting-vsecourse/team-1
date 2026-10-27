/**
 * Errors React never sees (event handlers, timers, rejected promises) are only logged for now;
 * sending them to monitoring is US-75. Call once at startup.
 */
export function installGlobalErrorHandlers(target: Window = window) {
  const onError = (event: ErrorEvent) => console.error(event.error ?? event.message)
  const onRejection = (event: PromiseRejectionEvent) => console.error(event.reason)

  target.addEventListener("error", onError)
  target.addEventListener("unhandledrejection", onRejection)

  return () => {
    target.removeEventListener("error", onError)
    target.removeEventListener("unhandledrejection", onRejection)
  }
}
