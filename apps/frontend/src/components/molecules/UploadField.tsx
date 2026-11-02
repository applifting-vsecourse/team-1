import { useRef } from "react"
import { TriangleAlert } from "lucide-react"

import { LogoSymbol } from "@/components/atoms/Logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type UploadFieldProps = {
  /** `done` shows the finished ring, `error` the red frame and alert icon. */
  state: "idle" | "done" | "error"
  title: string
  description: string
  buttonLabel: string
  /** Text inside the ring of the `done` state, e.g. `100 %` and `Hotovo`. */
  ringValue?: string
  ringLabel?: string
  /** `accept` of the file input, e.g. `image/jpeg,image/png`. */
  accept: string
  /** The picker stays closed while a file is being sent. */
  isDisabled?: boolean
  onSelect: (file: File) => void
}

/**
 * One action, „choose a file“: a dashed frame with the state above the button. No progress bar —
 * the finished state shows the ring with the corners of the logo.
 */
// Figma (Design system): Togena / Upload · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15207-1978
export function UploadField({
  state,
  title,
  description,
  buttonLabel,
  ringValue,
  ringLabel,
  accept,
  isDisabled = false,
  onSelect,
}: UploadFieldProps) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center",
        state === "error" ? "border-solid border-destructive" : "border-border",
      )}
    >
      {state === "done" ? (
        <CornerRing
          value={ringValue}
          label={ringLabel}
        />
      ) : state === "error" ? (
        <TriangleAlert
          aria-hidden="true"
          className="size-13 text-destructive"
          strokeWidth={1.8}
        />
      ) : (
        <LogoSymbol className="size-13 text-primary" />
      )}
      <p className={cn("text-xl font-semibold", state === "error" && "text-destructive")}>
        {title}
      </p>
      <p className="text-muted-foreground">{description}</p>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        data-testid="upload-input"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          // The same file may be chosen again after an error.
          event.target.value = ""
          if (file) onSelect(file)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={isDisabled}
        onClick={() => input.current?.click()}
      >
        {buttonLabel}
      </Button>
    </div>
  )
}

function CornerRing({ value, label }: { value?: string; label?: string }) {
  return (
    <div className="relative flex size-41 flex-col items-center justify-center text-sm text-primary">
      <svg
        aria-hidden="true"
        viewBox="0 0 165 165"
        fill="none"
        className="absolute inset-0 size-full"
      >
        <path
          d="M30 100V60c0-17 13-30 30-30h50"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M135 65v40c0 17-13 30-30 30H55"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
      <span>{value}</span>
      <span className="text-base text-muted-foreground">{label}</span>
    </div>
  )
}
