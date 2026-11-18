import { Input } from "@/components/ui/input"

// US-66: one time field in the block dialog, including previously saved minute values.
export function TimeSelect({
  value,
  onChange,
  ...props
}: { value: string; onChange: (value: string) => void } & Omit<
  React.ComponentProps<typeof Input>,
  "onChange" | "value"
>) {
  return (
    <Input
      {...props}
      type="time"
      step={60}
      className="w-full min-w-0 tabular-nums"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
