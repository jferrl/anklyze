"use client"

import { cn } from "@/lib/utils"

interface SelectionCardProps {
  value: string
  label: string
  selected: boolean
  onSelect: () => void
  keyboardHint?: string
  className?: string
  disabled?: boolean
  id?: string
}

/** SelectionCard is one option row; stack several inside a bordered `divide-y` box. */
function SelectionCard({
  value,
  label,
  selected,
  onSelect,
  keyboardHint,
  className,
  disabled = false,
  id,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      data-value={value}
      data-selected={selected}
      id={id}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left text-sm",
        "transition-colors duration-150",
        selected ? "bg-accent text-accent-foreground" : "hover:bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary" : "border-input"
        )}
      >
        {selected && <span className="size-2 rounded-full bg-primary" />}
      </span>

      <span className="flex-1 font-medium">{label}</span>

      {keyboardHint && (
        <span className="kbd-hint hidden sm:inline-flex">{keyboardHint}</span>
      )}
    </button>
  )
}

export { SelectionCard }
export type { SelectionCardProps }
