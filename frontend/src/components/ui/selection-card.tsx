"use client"

import { useRef, useState } from "react"
import { Check } from "lucide-react"
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
  const [showPulse, setShowPulse] = useState(false)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleSelect = () => {
    onSelect()
    setShowPulse(true)
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    pulseTimerRef.current = setTimeout(() => setShowPulse(false), 400)
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={handleSelect}
      data-value={value}
      data-selected={selected}
      id={id}
      className={cn(
        // Base styles
        "relative flex items-center gap-4 p-4 rounded-xl cursor-pointer w-full text-left",
        "border-2 transition-all duration-200 ease-out",
        "bg-muted/30 hover:bg-muted/50",
        // Default border
        "border-transparent",
        // Hover state
        "hover:border-muted-foreground/20 hover:shadow-md",
        // Selected state
        selected && [
          "border-primary/60 bg-primary/10",
          "shadow-lg shadow-primary/10",
          "hover:border-primary/70",
        ],
        // Pulse animation on selection
        showPulse && "selection-pulse",
        // Active press effect
        "active:scale-[0.98]",
        // Focus visible
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        // Disabled state
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200 shrink-0",
          selected
            ? "border-primary bg-primary text-primary-foreground scale-100"
            : "border-muted-foreground/30 bg-transparent scale-90"
        )}
      >
        {selected && (
          <Check className="w-3.5 h-3.5 animate-in zoom-in-50 duration-200" />
        )}
      </div>

      {/* Label */}
      <span className={cn(
        "font-medium flex-1 transition-colors duration-200",
        selected && "text-foreground"
      )}>
        {label}
      </span>

      {/* Keyboard hint badge - hidden on touch devices */}
      {keyboardHint && (
        <span className="kbd-hint opacity-60 transition-opacity hidden sm:inline-flex touch-device:hidden">
          {keyboardHint}
        </span>
      )}

      {/* Selection glow effect - enhanced for dark mode */}
      {selected && (
        <div className="absolute inset-0 rounded-xl bg-primary/5 dark:bg-primary/10 animate-in fade-in duration-300 pointer-events-none" />
      )}
    </button>
  )
}

export { SelectionCard }
export type { SelectionCardProps }
