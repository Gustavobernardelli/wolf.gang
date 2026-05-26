import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={ptBR}
      className={cn("p-3 bg-zinc-900 text-white rounded-md", className)}
      style={{
        ["--rdp-accent-color" as any]: "#7c3aed",
        ["--rdp-accent-background-color" as any]: "rgba(124, 58, 237, 0.2)",
        ["--rdp-day-height" as any]: "36px",
        ["--rdp-day-width" as any]: "36px",
      }}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-sm font-medium text-white",
        nav: "space-x-1 flex items-center",
        button_next: "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md text-white hover:bg-white/10",
        button_previous: "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md text-white hover:bg-white/10",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex justify-between",
        weekday: "text-white/40 rounded-md w-9 font-normal text-[0.8rem] text-center",
        week: "flex w-full mt-1 justify-between",
        day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center",
        day_button: cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 inline-flex items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        ),
        selected: "bg-violet-600 text-white hover:bg-violet-600 hover:text-white focus:bg-violet-600 focus:text-white",
        today: "bg-white/10 text-white",
        outside: "text-white/25 opacity-50",
        disabled: "text-white/20 opacity-50",
        range_start: "bg-violet-600 text-white rounded-l-md",
        range_end: "bg-violet-600 text-white rounded-r-md",
        range_middle: "bg-violet-600/20 text-white hover:bg-violet-600/30 hover:text-white rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <ChevronLeft className="h-4 w-4" />;
          }
          return <ChevronRight className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
