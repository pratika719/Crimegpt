"use client";

import { 
  FolderLock, 
  Percent, 
  HardDrive, 
  CheckSquare, 
  Activity, 
  Users, 
  Paperclip 
} from "lucide-react";

interface CaseOverviewCardsProps {
  status: "OPEN" | "UNDER_INVESTIGATION" | "CLOSED";
  completenessPercent: number;
  totalPersons: number;
  totalEvidence: number;
  checklistCompleted: number;
  checklistTotal: number;
}

export default function CaseOverviewCards({
  status,
  completenessPercent,
  totalPersons,
  totalEvidence,
  checklistCompleted,
  checklistTotal,
}: CaseOverviewCardsProps) {
  
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0;

  // Status mapping
  const getStatusConfig = () => {
    switch (status) {
      case "OPEN":
        return {
          label: "Active Open",
          bgColor: "bg-blue-50/50 dark:bg-blue-950/10",
          textColor: "text-blue-700 dark:text-blue-400",
          borderColor: "border-blue-200 dark:border-blue-900/30",
          dotColor: "bg-blue-500",
          description: "Awaiting initial legal analysis and evidence logging.",
        };
      case "UNDER_INVESTIGATION":
        return {
          label: "In Progress",
          bgColor: "bg-amber-50/50 dark:bg-amber-950/10",
          textColor: "text-amber-700 dark:text-amber-400",
          borderColor: "border-amber-200 dark:border-amber-900/30",
          dotColor: "bg-amber-500",
          description: "Active procedures and witness validations pending.",
        };
      case "CLOSED":
        return {
          label: "Case Resolved",
          bgColor: "bg-emerald-50/50 dark:bg-emerald-950/10",
          textColor: "text-emerald-700 dark:text-emerald-400",
          borderColor: "border-emerald-200 dark:border-emerald-900/30",
          dotColor: "bg-emerald-500",
          description: "All legal filings generated and procedures finalized.",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 font-sans">
      {/* CARD 1: Status */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            Case Status
          </span>
          <FolderLock className="h-4.5 w-4.5 text-zinc-400" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusConfig.dotColor} animate-pulse`} />
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-55">
              {statusConfig.label}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-normal">
            {statusConfig.description}
          </p>
        </div>
      </div>

      {/* CARD 2: Completeness */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            Dossier Completeness
          </span>
          <Percent className="h-4.5 w-4.5 text-zinc-400" />
        </div>
        <div className="space-y-2">
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-55 tracking-tight flex items-baseline gap-1">
            {completenessPercent}%
            <span className="text-[10px] font-mono font-normal text-zinc-400">coverage</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${completenessPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* CARD 3: Key Metrics */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            Dossier Assets
          </span>
          <HardDrive className="h-4.5 w-4.5 text-zinc-400" />
        </div>
        <div className="flex items-center gap-4 text-zinc-800 dark:text-zinc-200">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-zinc-450" />
            <span className="text-sm font-bold">{totalPersons}</span>
            <span className="text-[9px] font-mono text-zinc-400 uppercase">Parties</span>
          </div>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex items-center gap-1.5">
            <Paperclip className="h-4 w-4 text-zinc-450" />
            <span className="text-sm font-bold">{totalEvidence}</span>
            <span className="text-[9px] font-mono text-zinc-400 uppercase">Evidence</span>
          </div>
        </div>
      </div>

      {/* CARD 4: Checklist Tasks */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            Checklist Status
          </span>
          <CheckSquare className="h-4.5 w-4.5 text-zinc-400" />
        </div>
        <div className="space-y-2">
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-55 tracking-tight flex items-baseline gap-1">
            {checklistCompleted} / {checklistTotal}
            <span className="text-[10px] font-mono font-normal text-zinc-400 uppercase">Tasks ({checklistPercent}%)</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${checklistPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
