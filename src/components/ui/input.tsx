import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 hover:bg-zinc-100/30 focus-visible:bg-white dark:bg-zinc-950 dark:hover:bg-zinc-900/50 dark:focus-visible:bg-zinc-950 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 transition-all duration-200 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-visible:border-zinc-400 dark:focus-visible:border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-50/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input }
