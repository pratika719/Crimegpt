import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CaseLoading() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-pulse font-sans">
      {/* Breadcrumb Navigation Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <Link
          href="/case"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Case Directory
        </Link>
        <div className="h-5 w-44 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="h-8 w-2/3 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex gap-4">
          <div className="h-4 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="h-24 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50" />
      </div>

      {/* Overview Cards Skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-3"
          >
            <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-6 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Section Skeleton */}
      <div className="h-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
        <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-32 rounded-lg bg-zinc-100 dark:bg-zinc-800/40" />
      </div>
    </div>
  );
}
