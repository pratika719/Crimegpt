"use client";

import { useState, useTransition } from "react";
import { 
  Sparkles, 
  ShieldAlert, 
  CheckCircle, 
  BrainCircuit, 
  AlertCircle, 
  Loader2, 
  RefreshCcw,
  ChevronRight,
  Target,
  FileQuestion,
  FileCheck,
  Scale,
  Zap
} from "lucide-react";
import { runAIDiagnosticsAction } from "@/actions/ai-diagnostics.action";
import { toast } from "sonner";

interface AIDiagnostics {
  riskLevel: {
    level: "HIGH" | "MEDIUM" | "LOW";
    reasoning: string;
  };
  missingInformation: {
    items: string[];
    reasoning: string;
  };
  suggestedNextSteps: {
    steps: Array<{
      task: string;
      priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      reason: string;
    }>;
    reasoning: string;
  };
  applicableLegalSections: {
    sections: Array<{
      section: string;
      offense: string;
      applicability: string;
    }>;
    reasoning: string;
  };
  evidenceCompleteness: {
    score: number;
    assessment: string;
    gaps: string[];
    reasoning: string;
  };
}

interface CaseAIInsightsDashProps {
  caseId: string;
}

export default function CaseAIInsightsDash({ caseId }: CaseAIInsightsDashProps) {
  const [isPending, startTransition] = useTransition();
  const [diagnostics, setDiagnostics] = useState<AIDiagnostics | null>(null);

  const handleRunDiagnostics = () => {
    startTransition(async () => {
      const response = await runAIDiagnosticsAction(caseId);
      if (response.success && response.data) {
        setDiagnostics(response.data as AIDiagnostics);
        toast.success("Case insights refreshed successfully.");
      } else {
        toast.error(response.message || "Failed to run insights analysis.");
      }
    });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "HIGH": return "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20";
      case "MEDIUM": return "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20";
      case "LOW": return "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20";
      default: return "text-zinc-500 border-zinc-200 dark:border-zinc-800 bg-zinc-50";
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      CRITICAL: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/50",
      HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900/50",
      MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-orange-900/30",
      LOW: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border uppercase tracking-wider ${styles[priority] || ""}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Title/Section Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4.5 w-4.5 text-zinc-500 animate-pulse" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            AI Cognitive Insights & Diagnostics
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {diagnostics && (
            <button
              onClick={handleRunDiagnostics}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
            >
              <RefreshCcw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
              REFRESH INSIGHTS
            </button>
          )}
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-mono font-bold border ${
            diagnostics 
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/30" 
              : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-200/30"
          }`}>
            {isPending ? "ANALYZING..." : diagnostics ? "INSIGHTS COMPILED" : "AI STANDBY"}
          </span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
        
        {/* Futuristic Glassmorphic overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.01] via-transparent to-transparent pointer-events-none" />

        {/* Informative Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-5">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-zinc-850 dark:text-zinc-200 tracking-tight flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Automated Case Insights & Analysis
            </h4>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xl">
              CrimeGPT scans narratives, witness profiles, statements, checklist progress, and evidence to build risk models, find data gaps, and map applicable laws dynamically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Engine Status:</span>
            <span className={`text-[10px] font-mono font-bold uppercase bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded ${
              diagnostics ? "text-emerald-600" : "text-zinc-500"
            }`}>
              {isPending ? "Generating Metrics" : diagnostics ? "Dashboard Active" : "Awaiting Data Trigger"}
            </span>
          </div>
        </div>

        {diagnostics ? (
          <div className="grid gap-6 md:grid-cols-6 relative">
            
            {/* Widget 1: Risk Level (md:col-span-2) */}
            <div className="md:col-span-2 rounded-xl border border-zinc-150 dark:border-zinc-800/60 bg-zinc-50/10 dark:bg-zinc-950/10 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">01. Prosecution Risk Level</span>
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                </div>
                
                <div className="space-y-2">
                  <div className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono font-bold text-xs ${getRiskColor(diagnostics.riskLevel.level)}`}>
                    <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                    {diagnostics.riskLevel.level} RISK
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-serif italic border-l-2 border-zinc-200 dark:border-zinc-800 pl-3">
                    &quot;{diagnostics.riskLevel.reasoning}&quot;
                  </div>
                </div>
              </div>
              
              <div className="text-[9px] text-zinc-400 uppercase tracking-tighter">
                Computed via cognitive threat modeling
              </div>
            </div>

            {/* Widget 2: Evidence Completeness (md:col-span-4) */}
            <div className="md:col-span-4 rounded-xl border border-zinc-150 dark:border-zinc-800/60 bg-zinc-50/10 dark:bg-zinc-950/10 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">02. Evidence Completeness Audit</span>
                  <FileCheck className="h-4 w-4 text-emerald-500" />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {/* Progress bar column */}
                  <div className="space-y-2 col-span-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Score Matrix</span>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-mono font-bold leading-none text-zinc-850 dark:text-zinc-100">
                        {diagnostics.evidenceCompleteness.score}%
                      </span>
                    </div>
                    {/* Visual bar */}
                    <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" 
                        style={{ width: `${diagnostics.evidenceCompleteness.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Assessment/Gaps columns */}
                  <div className="space-y-2 md:col-span-2">
                    <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase">Gaps Detected</span>
                    {diagnostics.evidenceCompleteness.gaps && diagnostics.evidenceCompleteness.gaps.length > 0 ? (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-zinc-500">
                        {diagnostics.evidenceCompleteness.gaps.map((gap, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <ChevronRight className="h-3 w-3 mt-0.5 text-zinc-300 dark:text-zinc-700 flex-shrink-0" />
                            <span className="line-clamp-2">{gap}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-[10px] text-zinc-400 italic">No missing physical evidence types identified.</span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/40">
                  <strong className="text-zinc-700 dark:text-zinc-350 text-[10px] uppercase font-bold block mb-1">Assessment Analysis:</strong>
                  <p className="leading-relaxed">{diagnostics.evidenceCompleteness.reasoning}</p>
                </div>
              </div>

              <div className="text-[9px] text-zinc-400 uppercase tracking-tighter">
                Verification status: {diagnostics.evidenceCompleteness.assessment}
              </div>
            </div>

            {/* Widget 3: Suggested Next Steps (md:col-span-3) */}
            <div className="md:col-span-3 rounded-xl border border-zinc-150 dark:border-zinc-800/60 bg-zinc-50/10 dark:bg-zinc-950/10 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-455 dark:text-zinc-500">03. Suggested Next Steps</span>
                  <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
                </div>

                <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                  {diagnostics.suggestedNextSteps.steps.map((step, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/50 space-y-1 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 truncate">{step.task}</span>
                        {getPriorityBadge(step.priority)}
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-snug">{step.reason}</p>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pt-2 border-t border-zinc-100 dark:border-zinc-800/40">
                  <strong className="text-zinc-700 dark:text-zinc-350 text-[10px] uppercase font-bold block mb-0.5">Strategy Reasoning:</strong>
                  {diagnostics.suggestedNextSteps.reasoning}
                </div>
              </div>

              <div className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase tracking-tighter">
                Prioritized procedural actions list
              </div>
            </div>

            {/* Widget 4: Applicable Legal Sections (md:col-span-3) */}
            <div className="md:col-span-3 rounded-xl border border-zinc-150 dark:border-zinc-800/60 bg-zinc-50/10 dark:bg-zinc-950/10 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-455 dark:text-zinc-500">04. Applicable Legal Sections</span>
                  <Scale className="h-4 w-4 text-indigo-500" />
                </div>

                <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                  {diagnostics.applicableLegalSections.sections && diagnostics.applicableLegalSections.sections.length > 0 ? (
                    diagnostics.applicableLegalSections.sections.map((sect, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/50 space-y-1 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-900/50 px-1.5 py-0.5 rounded truncate">
                            {sect.section}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase truncate max-w-[150px]">{sect.offense}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-snug">{sect.applicability}</p>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-zinc-400 italic">No legal statutes mapped. Run analysis.</span>
                  )}
                </div>

                <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pt-2 border-t border-zinc-100 dark:border-zinc-800/40">
                  <strong className="text-zinc-700 dark:text-zinc-350 text-[10px] uppercase font-bold block mb-0.5">Statutory Reasoning:</strong>
                  {diagnostics.applicableLegalSections.reasoning}
                </div>
              </div>

              <div className="text-[9px] text-zinc-450 dark:text-zinc-500 uppercase tracking-tighter">
                Mapped against Indian Penal Code (IPC) / Bharatiya Nyaya Sanhita (BNS)
              </div>
            </div>

            {/* Widget 5: Missing Case Information (md:col-span-6) */}
            <div className="md:col-span-6 rounded-xl border border-zinc-150 dark:border-zinc-800/60 bg-zinc-50/10 dark:bg-zinc-950/10 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-455 dark:text-zinc-500">05. Missing Case Information</span>
                  <FileQuestion className="h-4 w-4 text-amber-500" />
                </div>

                <div className="grid md:grid-cols-5 gap-6">
                  {/* Items list */}
                  <div className="md:col-span-2 space-y-2 border-r border-zinc-200/50 dark:border-zinc-800/50 pr-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Critical Data Gaps</span>
                    {diagnostics.missingInformation.items && diagnostics.missingInformation.items.length > 0 ? (
                      <ul className="space-y-2">
                        {diagnostics.missingInformation.items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[10.5px] text-zinc-700 dark:text-zinc-300 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-2.5 rounded-lg">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        <span>All core dossier requirements fulfilled. No missing components.</span>
                      </div>
                    )}
                  </div>

                  {/* Reasoning Column */}
                  <div className="md:col-span-3 space-y-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Prosecution Impairment Risk</span>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed bg-white/50 dark:bg-zinc-950/20 p-3.5 rounded-lg border border-zinc-150 dark:border-zinc-800/40">
                      {diagnostics.missingInformation.reasoning}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-zinc-400 uppercase tracking-tighter">
                Audits dossier parameters across narratives and physical files
              </div>
            </div>

          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 relative">
            {/* Skeletons when awaiting run */}
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="rounded-xl border border-zinc-150 dark:border-zinc-800/60 bg-zinc-50/10 dark:bg-zinc-950/10 p-5 space-y-4 filter blur-[0.5px] select-none opacity-60">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider">0{idx}. Standby Module</span>
                  <BrainCircuit className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-zinc-150 dark:bg-zinc-800 rounded w-3/4" />
                  <div className="h-2.5 bg-zinc-150 dark:bg-zinc-800 rounded w-full" />
                  <div className="h-2.5 bg-zinc-150 dark:bg-zinc-800 rounded w-5/6" />
                </div>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-805 text-[10px] text-zinc-450 flex items-center justify-between">
                  <span>Engine Diagnostic Check</span>
                  <RefreshCcw className="h-3 w-3" />
                </div>
              </div>
            ))}

            {/* Premium Lock/Activation Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/5 dark:bg-zinc-900/5 backdrop-blur-[1.5px] rounded-xl border border-zinc-100/50 dark:border-zinc-800/50">
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-6 py-8 text-center shadow-lg max-w-sm space-y-5 transition-transform hover:scale-102">
                <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 shadow-inner">
                  {isPending ? (
                    <Loader2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  ) : (
                    <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <h5 className="text-sm font-bold text-zinc-850 dark:text-zinc-200 font-sans tracking-tight">
                    {isPending ? "Executing AI Insights Engine..." : "Compile AI Insights Dashboard"}
                  </h5>
                  <p className="text-xs text-zinc-450 dark:text-zinc-500 leading-relaxed">
                    {isPending 
                      ? "Scanning narrative logs, cross-referencing statements, assessing evidence completeness, and mapping legal applicability..."
                      : "Run a live case audit. Compute prosecution risks, identify critical missing dossier details, and generate procedural next steps."}
                  </p>
                </div>
                
                {!isPending && (
                  <button
                    onClick={handleRunDiagnostics}
                    className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold py-2.5 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
                  >
                    RUN AI DIAGNOSTICS
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
