"use client";

import { 
  ShieldAlert, 
  Calendar, 
  MapPin, 
  Gavel, 
  FileText, 
  Compass, 
  UserCheck, 
  ClipboardList,
  AlertOctagon
} from "lucide-react";

export interface ApplicableSection {
  section: string;
  reason: string;
}

export interface FIRResult {
  complaintSummary: string;
  incidentDate: string;
  incidentLocation: string;
  suspectedOffenses: string[];
  applicableSections: ApplicableSection[];
  factsOfCase: string;
  investigationDirections: string;
  officerRemarks: string;
}

interface FIRDocumentViewerProps {
  fir: FIRResult;
  version: number;
  createdAt: string;
}

export default function FIRDocumentViewer({ fir, version, createdAt }: FIRDocumentViewerProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden font-sans">
      {/* Header Badge */}
      <div className="bg-zinc-950 dark:bg-zinc-950 px-6 py-6 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-800 text-white gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-inner">
            <ShieldAlert className="h-6 w-6 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest font-mono text-zinc-500 dark:text-zinc-400 uppercase">
              First Information Report
            </h2>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-50">
              FORMAL FIR - VERSION {version}
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end text-[11px] font-mono text-zinc-300 dark:text-zinc-400 gap-1">
          <div>DOCUMENT ID: FIR-V{version}</div>
          <div>GENERATED: {createdAt}</div>
          <div className="rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 mt-1 font-semibold uppercase tracking-wider text-[9px]">
            LAW ENFORCEMENT ONLY
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* Metadatas grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Incident Date */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-950/30">
            <Calendar className="h-5 w-5 text-zinc-500 dark:text-zinc-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <span className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 font-mono tracking-widest">
                Date & Time of Occurrence
              </span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {fir.incidentDate}
              </p>
            </div>
          </div>
 
          {/* Incident Location */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-950/30">
            <MapPin className="h-5 w-5 text-zinc-500 dark:text-zinc-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <span className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 font-mono tracking-widest">
                Place of Occurrence
              </span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {fir.incidentLocation}
              </p>
            </div>
          </div>
        </div>

        {/* Complaint Summary */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-mono">
              1. Abstract of Complaint
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4 py-1">
            {fir.complaintSummary}
          </p>
        </div>
 
        {/* Suspected Offenses */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-405" />
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-mono">
              2. Suspected Offenses / Crimes
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {fir.suspectedOffenses.map((offense, index) => (
              <span 
                key={index} 
                className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 px-3 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200"
              >
                {offense}
              </span>
            ))}
          </div>
        </div>

        {/* Applicable Sections */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Gavel className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-mono">
              3. Applicable Sections of Law
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fir.applicableSections.map((sec, idx) => (
              <div 
                key={idx}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/10 p-4 space-y-2.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <Gavel className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <span className="text-xs font-mono font-bold">{sec.section}</span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {sec.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Facts of Case */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-mono">
              4. Chronological Facts of the Case
            </h3>
          </div>
          <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/10 p-5 font-mono text-xs leading-relaxed text-zinc-750 dark:text-zinc-300 whitespace-pre-wrap shadow-inner relative overflow-hidden min-h-[200px]">
            {/* Lined Paper Lines effect */}
            <div className="absolute inset-0 bg-grid-zinc-100/30 dark:bg-grid-zinc-900/10 pointer-events-none" />
            <span className="relative z-10">{fir.factsOfCase}</span>
          </div>
        </div>
 
        {/* Investigation Directions */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Compass className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-mono">
              5. Preliminary Investigation Directions
            </h3>
          </div>
          <div className="rounded-lg border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-xs leading-relaxed text-zinc-750 dark:text-zinc-350 whitespace-pre-wrap shadow-sm">
            {fir.investigationDirections}
          </div>
        </div>

        {/* Officer Remarks */}
        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-mono">
              6. SHO Remarks & Endorsement
            </h3>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 p-4 text-xs italic text-zinc-600 dark:text-zinc-400">
              &quot;{fir.officerRemarks}&quot;
            </div>
            <div className="flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50/10 dark:bg-zinc-900/30">
              <div className="w-full border-b border-dashed border-zinc-300 dark:border-zinc-700 min-h-[40px] flex items-end justify-center pb-2">
                <span className="font-mono text-[9px] text-zinc-500 dark:text-zinc-400 tracking-wider">SHO DIGITAL SIGNATURE</span>
              </div>
              <div className="text-center mt-2.5 space-y-0.5">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Station House Officer</div>
                <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">CrimeGPT Legal Assistant</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
