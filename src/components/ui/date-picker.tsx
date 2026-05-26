import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"

interface DatePickerProps {
  date: Date | DateRange | undefined
  setDate: (date: any) => void
  placeholder?: string
  className?: string
  mode?: "single" | "range"
}

export function DatePicker({ 
  date, 
  setDate, 
  placeholder = "Selecionar data", 
  className,
  mode = "single"
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            mode === "range" ? "w-64" : "w-48",
            "justify-start text-left font-normal bg-zinc-900 border-white/10 text-white/70 hover:bg-zinc-800 hover:text-white",
            !date && "text-white/30",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">
            {date ? (
              date instanceof Date ? (
                format(date, "dd/MM/yyyy", { locale: ptBR })
              ) : (
                // It's a DateRange
                (date as DateRange).from ? (
                  (date as DateRange).to ? (
                    `${format((date as DateRange).from!, "dd/MM/yyyy", { locale: ptBR })} - ${format((date as DateRange).to!, "dd/MM/yyyy", { locale: ptBR })}`
                  ) : (
                    format((date as DateRange).from!, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  placeholder
                )
              )
            ) : (
              placeholder
            )}
          </span>
          {date && (
            <X
              className="ml-1 h-3.5 w-3.5 opacity-50 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setDate(undefined); }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10" align="start">
        <Calendar
          mode={mode}
          selected={date as any}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
