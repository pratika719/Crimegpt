"use client";

import { 
  FileText, 
  CalendarRange, 
  FileCheck2, 
  Gavel, 
  Search, 
  Users, 
  Briefcase, 
  AlertCircle, 
  ListTodo, 
  CheckCircle2,
  Lock
} from "lucide-react";

export interface SummaryApplicableSection {
  section: string;
  reason: string;
}

export interface InvestigationSummaryResult {
  executiveSummary: string;
  incidentOverview: string;
  factsEstablished: string;
  applicableSections: SummaryApplicableSection[];
  evidenceAssessment: string;
  personsInvolved: string;
  investigationFindings: string;
  potentialGaps: string;
  recommendedNextSteps: string;
  conclusion: string;
}

interface InvestigationSummaryViewerProps {
  summary: InvestigationSummaryResult;
  version: number;
  createdAt: string;
}

export default function InvestigationSummaryViewer({ 
  summary, 
  version, 
  createdAt 
}: InvestigationSummaryViewerProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden font-sans">
      {/* Dossier Header Strip */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-6 md:py-8 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Lock className="h-5 w-5 text-red-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-[10px] font-bold tracking-widest font-mono text-zinc-400 uppercase">
              Official Investigation Briefing
            </h2>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-zinc-50">
              INVESTIGATION SUMMARY REPORT - v{version}
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end text-[10px] font-mono text-zinc-400 gap-0.5">
          <div>REF: CRIME-SUM-V{version}</div>
          <div>GENERATED: {createdAt}</div>
          <div className="rounded bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 mt-1 font-semibold uppercase tracking-wider text-[8px]">
            RESTRICTED - LAW ENFORCEMENT ONLY
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8 divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {/* Executive Summary */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              1. Executive Summary
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 border-l-2 border-zinc-900 dark:border-zinc-300 pl-4 py-1 font-sans font-medium">
            {summary.executiveSummary}
          </p>
        </div>

        {/* Incident Overview */}
        <div className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              2. Incident Overview & Timeline
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-650 dark:text-zinc-400 whitespace-pre-wrap pl-1 font-sans">
            {summary.incidentOverview}
          </p>
        </div>

        {/* Facts Established */}
        <div className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              3. Established Facts of Case
            </h3>
          </div>
          <div className="rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/20 p-5 font-mono text-xs leading-relaxed text-zinc-750 dark:text-zinc-300 whitespace-pre-wrap relative shadow-inner">
            <span className="relative z-10">{summary.factsEstablished}</span>
          </div>
        </div>

        {/* Applicable Law Sections */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Gavel className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              4. Applicable Statutes & Sections
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.applicableSections.map((sec, idx) => (
              <div 
                key={idx}
                className="rounded-lg border border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/20 p-4 space-y-2 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-mono font-bold text-xs">
                  <Gavel className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  <span>{sec.section}</span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 font-sans">
                  {sec.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Assessment */}
        <div className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <Search className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              5. Physical / Circumstantial Evidence Assessment
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-650 dark:text-zinc-400 whitespace-pre-wrap pl-1 font-sans">
            {summary.evidenceAssessment}
          </p>
        </div>

        {/* Persons Involved */}
        <div className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              6. Dossier Profiles (Victims, Suspects, Witnesses)
            </h3>
          </div>
          <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/10 p-5 font-mono text-xs leading-relaxed text-zinc-750 dark:text-zinc-350 whitespace-pre-wrap">
            {summary.personsInvolved}
          </div>
        </div>

        {/* Investigation Findings */}
        <div className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              7. Detailed Investigation Findings
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-650 dark:text-zinc-400 whitespace-pre-wrap pl-1 font-sans">
            {summary.investigationFindings}
          </p>
        </div>

        {/* Potential Gaps */}
        <div className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              8. Investigation Gaps / Evidence Discrepancies
            </h3>
          </div>
          <div className="rounded-lg border border-amber-250 dark:border-amber-900/30 bg-amber-500/5 p-4 text-xs text-zinc-750 dark:text-zinc-350 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="whitespace-pre-wrap font-sans">{summary.potentialGaps}</div>
          </div>
        </div>

        {/* Recommended Next Steps */}
        <div className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              9. Recommended Immediate Action Items
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-650 dark:text-zinc-400 whitespace-pre-wrap pl-1 font-sans">
            {summary.recommendedNextSteps}
          </p>
        </div>

        {/* Conclusion */}
        <div className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              10. Conclusion & Legal Recommendation
            </h3>
          </div>
          <div className="rounded-lg border border-zinc-150 dark:border-zinc-800 bg-zinc-50/35 dark:bg-zinc-950/20 p-5 text-xs text-zinc-700 dark:text-zinc-300 font-sans italic leading-relaxed">
            &quot;{summary.conclusion}&quot;
          </div>
        </div>
      </div>
    </div>
  );
}
