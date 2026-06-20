"use client";

import { 
  FileText, 
  Calendar, 
  User, 
  ListTodo, 
  BookOpen, 
  UserCheck 
} from "lucide-react";
import { CaseDiaryOutput } from "@/schema/case-diary.schema";

interface CaseDiaryViewerProps {
  diary: CaseDiaryOutput;
  version: number;
  createdAt: string;
}

export default function CaseDiaryViewer({ diary, version, createdAt }: CaseDiaryViewerProps) {
  const { diaryDate, investigatingOfficer, caseDetails, narrativeDiary, nextSteps } = diary;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-zinc-950 px-6 py-6 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-800 text-white gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-inner">
            <BookOpen className="h-6 w-6 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest font-mono text-zinc-400 uppercase">
              Investigation Case Diary
            </h2>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-50">
              OFFICIAL CASE DIARY - v{version}
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end text-[11px] font-mono text-zinc-400 gap-1">
          <div>DOCUMENT ID: CD-V{version}</div>
          <div>DIARY DATE: {diaryDate}</div>
          <div>GENERATED: {createdAt}</div>
          <div className="rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 mt-1 font-semibold uppercase tracking-wider text-[9px]">
            RECORD UNDER SEC. 172 CrPC
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* Officer & Case info grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex items-start gap-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-4">
            <User className="h-5 w-5 text-zinc-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1 text-xs">
              <span className="block uppercase font-bold text-zinc-400 font-mono tracking-widest">
                Investigating Officer
              </span>
              <p className="font-semibold text-zinc-805 dark:text-zinc-200">
                {investigatingOfficer}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-4">
            <FileText className="h-5 w-5 text-zinc-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1 text-xs">
              <span className="block uppercase font-bold text-zinc-400 font-mono tracking-widest">
                FIR Reference
              </span>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                {caseDetails.firNumber}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-4">
            <Calendar className="h-5 w-5 text-zinc-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1 text-xs">
              <span className="block uppercase font-bold text-zinc-400 font-mono tracking-widest">
                Diary Registration Date
              </span>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                {diaryDate}
              </p>
            </div>
          </div>
        </div>

        {/* Narrative Diary section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              Chronological Narrative Case Diary Log
            </h3>
          </div>
          
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 p-6 md:p-8 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap relative min-h-[300px] shadow-inner overflow-hidden">
            {/* Lined paper effect styling */}
            <div className="absolute inset-0 bg-grid-zinc-100/40 dark:bg-grid-zinc-900/10 pointer-events-none" />
            <span className="relative z-10 block pl-2 border-l border-red-500/30 dark:border-red-900/30">
              {narrativeDiary}
            </span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              Actionable Investigation Next Steps
            </h3>
          </div>
          <div className="grid gap-2.5">
            {nextSteps.map((step, idx) => (
              <div 
                key={idx}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-950/10 p-4 text-xs text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Digital Signature */}
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-400 italic max-w-lg">
            This entry constitutes a formal record under section 172 of the Code of Criminal Procedure (CrPC).
          </div>
          <div className="flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50/10 dark:bg-zinc-900/30 w-full md:w-64">
            <div className="w-full border-b border-dashed border-zinc-300 dark:border-zinc-700 min-h-[40px] flex items-end justify-center pb-2">
              <span className="font-mono text-[9px] text-zinc-400 tracking-wider">SHO DIGITAL SIGNATURE</span>
            </div>
            <div className="text-center mt-2.5 space-y-0.5 text-xs">
              <div className="font-bold text-zinc-800 dark:text-zinc-200">Station House Officer</div>
              <div className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500">CrimeGPT Legal Assistant</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
