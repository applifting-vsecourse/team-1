import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react"
import { useTranslation } from "react-i18next"

import eyeOff from "@/assets/forms/eye-off.svg"
import eye from "@/assets/forms/eye.svg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Password input with a show / hide button. Toggling changes neither the value
 * nor the focus of the field; the button carries `aria-pressed`.
 */
// Figma: Togena / Forms / Password field · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15271-7417
export const PasswordInput = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "type">>(
  function PasswordInput({ className, ...props }, ref) {
    const { t } = useTranslation("common")
    const [isVisible, setIsVisible] = useState(false)

    const inputRef = useRef<HTMLInputElement>(null)
    const selectionRef = useRef<{
      start: number | null
      end: number | null
      direction: "forward" | "backward" | "none" | null
    } | null>(null)

    useImperativeHandle(ref, () => inputRef.current!, [])
    useLayoutEffect(() => {
      const selection = selectionRef.current
      if (selection) {
        inputRef.current?.setSelectionRange(
          selection.start,
          selection.end,
          selection.direction ?? undefined,
        )
        selectionRef.current = null
      }
    }, [isVisible])

    function toggleVisibility() {
      const input = inputRef.current
      if (input) {
        selectionRef.current = {
          start: input.selectionStart,
          end: input.selectionEnd,
          direction: input.selectionDirection,
        }
      }
      setIsVisible((isShown) => !isShown)
    }

    return (
      <div className="relative">
        <Input
          ref={inputRef}
          type={isVisible ? "text" : "password"}
          className={cn("pr-12", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          disabled={props.disabled}
          aria-label={t(isVisible ? "password.hide" : "password.show")}
          aria-pressed={isVisible}
          // Keeps the focus (and the caret) in the field.
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleVisibility}
        >
          <img
            src={isVisible ? eyeOff : eye}
            alt=""
          />
        </Button>
      </div>
    )
  },
)
