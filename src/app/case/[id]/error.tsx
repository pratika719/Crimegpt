"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CaseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error in CaseDetailPage boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="max-w-md w-full space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 shadow-sm">
          <AlertCircle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded">
            Dossier Render Exception
          </span>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Failed to Load Case Dossier
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {error.message || "An unexpected error occurred while parsing the case information from the backend."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>

          <Link
            href="/case"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2 text-xs font-semibold shadow-sm transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Case Directory</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
