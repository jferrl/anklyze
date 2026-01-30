"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface QuestionCardProps {
  children: React.ReactNode
  className?: string
  /** Unique key for animation reset when question changes */
  questionKey?: string
}

function QuestionCard({
  children,
  className,
  questionKey,
}: QuestionCardProps) {
  return (
    <div
      key={questionKey}
      data-slot="question-card"
      className={cn(
        // Base card styles
        "relative flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        // Glassmorphism effect
        "bg-card/80 backdrop-blur-sm",
        "border-border/50",
        // Entrance animation
        "question-card-enter",
        // Subtle hover effect
        "transition-shadow duration-300",
        "hover:shadow-md hover:shadow-primary/5",
        className
      )}
    >
      {/* Gradient accent bar at top - adapts to light/dark mode */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 dark:from-primary/30 dark:via-primary/50 dark:to-primary/30" />

      {/* Content */}
      {children}
    </div>
  )
}

function QuestionCardHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="question-card-header"
      className={cn(
        "grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function QuestionCardTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="question-card-title"
      className={cn(
        "text-lg font-semibold leading-tight tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

function QuestionCardContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="question-card-content"
      className={cn("px-6", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  QuestionCard,
  QuestionCardHeader,
  QuestionCardTitle,
  QuestionCardContent,
}
export type { QuestionCardProps }
