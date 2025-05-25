"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export interface SimpleDateInputProps {
  date?: Date
  setDate?: (date: Date | undefined) => void
  disabled?: boolean
  className?: string
  label?: string
}

const SimpleDateInput = React.forwardRef<HTMLDivElement, SimpleDateInputProps>(
  ({ date, setDate, disabled, className, label }, ref) => {
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (value) {
          const newDate = new Date(value)
          setDate?.(newDate)
        } else {
          setDate?.(undefined)
        }
      },
      [setDate]
    )

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {label && <Label>{label}</Label>}
        <Input
          type="date"
          value={date ? format(date, "yyyy-MM-dd") : ""}
          onChange={handleChange}
          disabled={disabled}
          className="w-full"
        />
      </div>
    )
  }
)

SimpleDateInput.displayName = "SimpleDateInput"

export default SimpleDateInput 