import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 hover:bg-zinc-100/30 focus-visible:bg-white dark:bg-zinc-950 dark:hover:bg-zinc-900/50 dark:focus-visible:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 transition-all duration-200 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-visible:border-zinc-400 dark:focus-visible:border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-50/10 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
