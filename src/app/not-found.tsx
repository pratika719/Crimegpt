import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6 select-none font-sans">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-teal-400 shadow-xl">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">
            HTTP 404 • Resource Missing
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Page or Record Not Found
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The requested destination or case dossier could not be located, has been archived, or access is restricted.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/case"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 px-4 py-2.5 text-xs font-semibold shadow-sm transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Case Directory</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 text-xs font-semibold transition-all"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Platform Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
