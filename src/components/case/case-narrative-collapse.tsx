"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

interface CaseNarrativeCollapseProps {
  narrative: string;
}

export default function CaseNarrativeCollapse({ narrative }: CaseNarrativeCollapseProps) {
  const [isOpen, setIsOpen] = useState(false);

  const wordCount = narrative.split(/\s+/).filter(Boolean).length;
  const charCount = narrative.length;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden transition-all duration-300">
      {/* Header Strip */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-6 py-4 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <FileText className="h-4.5 w-4.5" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider">
            Official Case Statement & Narrative
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors uppercase cursor-pointer"
        >
          {isOpen ? (
            <>
              <span>Collapse Statement</span>
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              <span>Expand Statement ({wordCount} words)</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Narrative Panel Content */}
      <div className={`p-5 md:p-6 transition-all duration-300 overflow-hidden ${isOpen ? "max-h-[1500px]" : "max-h-[110px] relative"}`}>
        {!isOpen && (
          // Visual fade out mask when collapsed
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent pointer-events-none" />
        )}
        
        {/* Simulated Lined Investigation Paper */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/20 p-5 md:p-6 font-mono text-xs md:text-sm leading-relaxed text-zinc-800 dark:text-zinc-350 whitespace-pre-wrap shadow-inner">
          {narrative}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-6 py-3 flex items-center justify-between text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-50/20 dark:bg-zinc-950/10">
          <span>Words: {wordCount}</span>
          <span>Characters: {charCount}</span>
        </div>
      )}
    </div>
  );
}
