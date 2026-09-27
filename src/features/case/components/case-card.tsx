"use client";

import Link from "next/link";
import { Calendar, FileText, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

type CaseCardProps = {
  case: {
    id: string;
    title: string;
    narrative: string;
    status: string;
    createdAt?: Date | string;
  };
  isHighlighted?: boolean;
};

export function CaseCard({ case: caseItem, isHighlighted }: CaseCardProps) {
  // Format creation date
  const formattedDate = caseItem.createdAt
    ? new Date(caseItem.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No Date Recorded";

  // Calculate approximate reading/word length metric
  const wordCount = caseItem.narrative.split(/\s+/).filter(Boolean).length;

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all duration-300 ${
        isHighlighted
          ? "border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10 bg-blue-50/20 dark:bg-blue-950/20"
          : "border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700"
      }`}
    >
      <div>
        {/* Badge & Metadata Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-medium border ${
                caseItem.status === "OPEN"
                  ? "bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30"
                  : caseItem.status === "UNDER_INVESTIGATION"
                  ? "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30"
              }`}
            >
              {caseItem.status === "UNDER_INVESTIGATION" ? "Active Inquest" : caseItem.status}
            </span>
            {isHighlighted && (
              <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-mono font-semibold bg-blue-600 text-white animate-pulse">
                <span className="h-1 w-1 rounded-full bg-white animate-ping" />
                JUST ADDED
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
            ID: {caseItem.id.slice(-6).toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-3.5 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors line-clamp-1">
          {caseItem.title}
        </h3>

        {/* Narrative Description Preview */}
        <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-3">
          {caseItem.narrative}
        </p>
      </div>

      {/* Footer Details */}
      <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {wordCount} words
          </span>
        </div>

        <Link
          href={`/case/${caseItem.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors group/link"
        >
          View Dossier
          <ArrowRight className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}