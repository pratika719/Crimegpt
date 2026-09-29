import Link from "next/link";
import { FolderX, ArrowLeft, RefreshCw } from "lucide-react";

export default function CaseNotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="max-w-md w-full space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-500 dark:text-zinc-400 shadow-sm">
          <FolderX className="h-7 w-7 text-amber-500" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 rounded">
            Dossier Access Restriction or Missing Record
          </span>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Case Dossier Not Found
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            The requested case identifier does not exist, was permanently deleted, or belongs to another investigator under database isolation policies.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/case"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white px-4 py-2.5 text-xs font-semibold shadow-sm transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Case Directory</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
