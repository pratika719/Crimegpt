import { CaseService } from "@/services/case/case.services";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileText, 
  ShieldAlert, 
  Download, 
  Play,
  Briefcase,
  ExternalLink
} from "lucide-react";
import CaseAnalysisPanel from "@/components/case/case-analysis-panel";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = new CaseService();

  try {
    const caseItem = await service.getCaseById(id);

    const documents = caseItem.documents || [];

    // Format timestamps
    const dateCreated = caseItem.createdAt
      ? new Date(caseItem.createdAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Not Recorded";

    const dateUpdated = caseItem.updatedAt
      ? new Date(caseItem.updatedAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Not Recorded";

    const wordCount = caseItem.narrative.split(/\s+/).filter(Boolean).length;
    const charCount = caseItem.narrative.length;

    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/case"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Case Directory
          </Link>

          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-1 rounded">
            Classified: Law Enforcement Sensitive
          </div>
        </div>

        {/* Dynamic Column Split */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Main Case Dossier Sheet (Left Column, 2/3 Width) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
              {/* Dossier Header Strip */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <FileText className="h-4.5 w-4.5" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider">Case Record Dossier</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">STATUS LOG v1.02</span>
              </div>

              {/* Dossier Title and Meta Section */}
              <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800/50">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {caseItem.title}
                </h1>
                
                <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-zinc-400 dark:text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Filed: {dateCreated}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Ref: {caseItem.id.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Narrative Content Body (Formatted Official Document View) */}
              <div className="p-6 md:p-8 space-y-4">
                <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                  Official Statement & Narrative
                </h3>
                
                {/* Simulated Lined Investigation Paper */}
                <div className="rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/20 p-6 font-mono text-sm leading-relaxed text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap shadow-inner min-h-[300px]">
                  {caseItem.narrative}
                </div>
              </div>

              {/* Case Stats Footer */}
              <div className="border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/20 dark:bg-zinc-900/10 px-6 py-4 flex items-center justify-between text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                <span>Total Words: {wordCount}</span>
                <span>Characters: {charCount}</span>
              </div>
            </div>

            {/* AI Document Generation Panel */}
            <CaseAnalysisPanel caseId={caseItem.id} initialDocuments={documents} />
          </div>

          {/* Case Metadata & Action Side-Panel (Right Column, 1/3 Width) */}
          <div className="space-y-6">
            {/* Status & Quick Info */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest font-mono">
                Dossier Metadata
              </h3>

              <div className="space-y-4">
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-zinc-400 font-mono">Current Status</span>
                  <div className="mt-2.5">
                    <span
                      className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold border ${
                        caseItem.status === "OPEN"
                          ? "bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30"
                          : caseItem.status === "UNDER_INVESTIGATION"
                          ? "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30"
                      }`}
                    >
                      {caseItem.status === "UNDER_INVESTIGATION" ? "Under Investigation" : caseItem.status}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800/50 pt-4 space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Created:</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium text-right">{dateCreated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Last Updated:</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium text-right">{dateUpdated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Classification:</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold">RESTRICTED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest font-mono">
                Platform Action Items
              </h3>
              
              <div className="space-y-2.5">
                <button className="w-full flex items-center justify-between text-left rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 py-3 text-xs font-semibold transition-all">
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="h-4 w-4 text-zinc-500" />
                    <span>Draft Charge Sheet</span>
                  </div>
                  <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-[8px] font-mono text-zinc-400 uppercase">AI Tool</span>
                </button>

                <button className="w-full flex items-center justify-between text-left rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 py-3 text-xs font-semibold transition-all">
                  <div className="flex items-center gap-2.5">
                    <Download className="h-4 w-4 text-zinc-500" />
                    <span>Export Case Briefing</span>
                  </div>
                  <ExternalLink className="h-3 w-3 text-zinc-400" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
