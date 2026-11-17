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
      className={cn("question-card-enter flex flex-col gap-3", className)}
    >
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
      className={cn("grid gap-1", className)}
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
      className={cn("text-xl font-semibold tracking-tight", className)}
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
      className={className}
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
