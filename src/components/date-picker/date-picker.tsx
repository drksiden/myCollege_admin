"use client"

import * as React from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  date?: Date
  setDate?: (date: Date | undefined) => void
  disabled?: boolean
  className?: string
}

const DatePicker = React.forwardRef<
  HTMLButtonElement,
  DatePickerProps
>(({
  date,
  setDate,
  disabled,
  className,
}, ref) => {
  const [open, setOpen] = React.useState(false)

  const handleSelect = React.useCallback((date: Date | undefined) => {
    setDate?.(date)
    setOpen(false)
  }, [setDate])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          type="button"
          onClick={(e) => {
            e.preventDefault()
            setOpen(true)
          }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: ru }) : <span>Выберите дату</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start"
        onPointerDownOutside={(e) => {
          e.preventDefault()
        }}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
        }}
        onInteractOutside={(e) => {
          e.preventDefault()
        }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={disabled}
          initialFocus
          locale={ru}
        />
      </PopoverContent>
    </Popover>
  )
})

DatePicker.displayName = "DatePicker"

export default DatePicker 