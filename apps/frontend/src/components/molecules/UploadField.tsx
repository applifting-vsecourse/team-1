import { useRef } from "react"
import { Trash2 } from "lucide-react"

import { LogoSymbol } from "@/components/atoms/Logo"
import { Button } from "@/components/ui/button"

type UploadFieldProps = {
  title: string
  description: string
  buttonLabel: string
  /** A line under the buttons that is always there, e.g. the size limit. */
  note?: string
  /** With these a chosen file can be taken away again. */
  removeLabel?: string
  onRemove?: () => void
  /** The chosen image; shown above the title once there is one. */
  previewUrl?: string | null
  /** What went wrong with the last file, under the frame. */
  error?: string | null
  /** `accept` of the file input, e.g. `image/jpeg,image/png`. */
  accept: string
  /** The picker stays closed while a file is being sent. */
  isDisabled?: boolean
  onSelect: (file: File) => void
}

/**
 * One action, „choose a file“: a dashed frame with the logo or the chosen image, a title, a hint
 * and the button. No progress bar; an error is a line of text under the frame.
 */
// Figma (Design system): Togena / Upload · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15207-1978
export function UploadField({
  title,
  description,
  buttonLabel,
  note,
  removeLabel,
  onRemove,
  previewUrl,
  error,
  accept,
  isDisabled = false,
  onSelect,
}: UploadFieldProps) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="max-h-48 w-full rounded-md object-cover"
          />
        ) : (
          <LogoSymbol className="size-13 text-primary" />
        )}
        <p className="text-lg font-semibold">{title}</p>
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
        {onRemove && removeLabel ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            disabled={isDisabled}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
            {removeLabel}
          </Button>
        ) : null}
        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      </div>
      {error ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
