import { forwardRef, useState, type ComponentProps } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Password input with a show / hide button. Toggling changes neither the value
 * nor the focus of the field; the button carries `aria-pressed`.
 */
// Figma (Design system): Togena / Password field · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15303-10792
export const PasswordInput = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "type">>(
  function PasswordInput({ className, ...props }, ref) {
    const { t } = useTranslation("common")
    const [isVisible, setIsVisible] = useState(false)

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={isVisible ? "text" : "password"}
          className={cn("pr-12", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="absolute top-0 right-0 size-12"
          aria-label={t(isVisible ? "password.hide" : "password.show")}
          aria-pressed={isVisible}
          // Keeps the focus (and the caret) in the field.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsVisible((isShown) => !isShown)}
        >
          {isVisible ? (
            <EyeOff
              className="size-5"
              aria-hidden="true"
            />
          ) : (
            <Eye
              className="size-5"
              aria-hidden="true"
            />
          )}
        </Button>
      </div>
    )
  },
)
