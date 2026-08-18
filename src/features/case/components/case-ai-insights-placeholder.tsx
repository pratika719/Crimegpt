"use client";

import { Sparkles, Lock, ArrowRight, ShieldAlert, CheckCircle, BrainCircuit } from "lucide-react";

export default function CaseAIInsightsPlaceholder() {
  return (
    <div className="space-y-4 font-sans">
      {/* Title/Section Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4.5 w-4.5 text-zinc-500" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            AI Cognitive Insights & Diagnostics
          </h2>
        </div>
        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-mono font-bold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-200/30">
          AI Standby
        </span>
      </div>

      {/* Main Container Card */}
      <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
        
        {/* Futuristic Glassmorphic overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.01] via-transparent to-transparent pointer-events-none" />

        {/* Informative Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-5">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
              Automated Case Diagnostics
            </h4>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xl">
              CrimeGPT scans narratives, witness profiles, statement histories, and logged evidence to map legal contradictions, identify risk categories, and propose procedure audits.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Engine Status:</span>
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              Awaiting Log Assets
            </span>
          </div>
        </div>

        {/* Insight Slots Placeholder Grid */}
        <div className="grid gap-4 md:grid-cols-3 relative">
          
          {/* Card 1: Legal Risk Analysis */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/10 dark:bg-zinc-950/10 p-5 space-y-4 filter blur-[0.5px] select-none">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">01. Legal Risk Assessment</span>
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
            
            {/* Skeletons */}
            <div className="space-y-2">
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
              <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-805 text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Coverage Check</span>
              <Lock className="h-3 w-3" />
            </div>
          </div>

          {/* Card 2: Statement Discrepancy Checks */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/10 dark:bg-zinc-950/10 p-5 space-y-4 filter blur-[0.5px] select-none">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">02. Statement Cross-Reference</span>
              <BrainCircuit className="h-3.5 w-3.5" />
            </div>
            
            {/* Skeletons */}
            <div className="space-y-2">
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
              <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-805 text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Alibi Cross-Verify</span>
              <Lock className="h-3 w-3" />
            </div>
          </div>

          {/* Card 3: Next Actions */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/10 dark:bg-zinc-950/10 p-5 space-y-4 filter blur-[0.5px] select-none">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">03. Procedural Recommendations</span>
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
            
            {/* Skeletons */}
            <div className="space-y-2">
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
              <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-4/5" />
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-805 text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Gap Assessment</span>
              <Lock className="h-3 w-3" />
            </div>
          </div>

          {/* Premium Lock Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-white/5 dark:bg-zinc-900/5 backdrop-blur-[1.5px] rounded-xl border border-zinc-100/50 dark:border-zinc-800/50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-4 text-center shadow-lg max-w-xs space-y-2.5 transition-transform hover:scale-102">
              <div className="mx-auto h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
                <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-sans tracking-tight">
                  Diagnostics Engine Pending
                </h5>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal">
                  Requires complete case metadata, at least 1 witness statement, and checklist milestones to compute risk vectors.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
