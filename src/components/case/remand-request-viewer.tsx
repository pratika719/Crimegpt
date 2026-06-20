"use client";

import { 
  FileText, 
  Users, 
  ShieldAlert, 
  ClipboardList, 
  ListTodo, 
  Lock,
  UserCheck 
} from "lucide-react";
import { RemandRequestOutput } from "@/schema/remand-request.schema";

interface RemandRequestViewerProps {
  remandRequest: RemandRequestOutput;
  version: number;
  createdAt: string;
}

export default function RemandRequestViewer({ remandRequest, version, createdAt }: RemandRequestViewerProps) {
  const { caseDetails, accusedDetails, groundsForRemand, custodyRequested, investigationProgress, officerRemarks } = remandRequest;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-zinc-950 px-6 py-6 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-800 text-white gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-inner">
            <Lock className="h-6 w-6 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest font-mono text-zinc-400 uppercase">
              Custody Remand Petition
            </h2>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-50">
              REMAND APPLICATION - v{version}
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end text-[11px] font-mono text-zinc-400 gap-1">
          <div>DOCUMENT ID: REM-V{version}</div>
          <div>GENERATED: {createdAt}</div>
          <div className="rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 mt-1 font-semibold uppercase tracking-wider text-[9px]">
            SUBMISSION TO COURT ONLY
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* Case Details Box */}
        <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-5 space-y-3">
          <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
            Case Details (U/S 167 CrPC)
          </h3>
          <div className="grid gap-4 sm:grid-cols-3 text-xs font-mono">
            <div>
              <span className="block text-zinc-400 dark:text-zinc-500 mb-0.5">FIR NUMBER</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{caseDetails.firNumber}</span>
            </div>
            <div>
              <span className="block text-zinc-400 dark:text-zinc-500 mb-0.5">POLICE STATION</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{caseDetails.policeStation}</span>
            </div>
            <div>
              <span className="block text-zinc-400 dark:text-zinc-500 mb-0.5">INVESTIGATING OFFICER</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{caseDetails.investigatingOfficer}</span>
            </div>
          </div>
        </div>

        {/* Custody Request Status Banner */}
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">
              Custody Remand Requested
            </span>
            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Type: {custodyRequested.type === "POLICE_CUSTODY" ? "Police Custody (Interrogation/Recovery)" : "Judicial Custody (Detention)"}
            </div>
          </div>
          <div className="rounded-md bg-amber-500 text-white dark:bg-amber-600 px-4 py-2 font-mono text-center font-bold text-sm">
            {custodyRequested.durationDays} DAYS REQUESTED
          </div>
        </div>

        {/* Accused Under Remand */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              1. Accused Subject to Remand Request
            </h3>
          </div>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 font-mono text-zinc-400 uppercase text-[10px]">
                  <th className="py-3 px-5 font-semibold">Accused Name</th>
                  <th className="py-3 px-5 font-semibold">Date & Time of Arrest</th>
                  <th className="py-3 px-5 font-semibold text-right">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                {accusedDetails.map((accused, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800">
                    <td className="py-3 px-5 font-semibold">{accused.name}</td>
                    <td className="py-3 px-5 font-mono">{accused.arrestDateTime}</td>
                    <td className="py-3 px-5 text-right font-mono font-semibold text-amber-500">
                      {accused.currentCustodyStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grounds for Remand */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              2. Technical Grounds Supporting Remand Petition
            </h3>
          </div>
          <div className="grid gap-3">
            {groundsForRemand.map((ground, i) => (
              <div 
                key={i}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/10 p-4 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium flex items-start gap-3"
              >
                <span className="rounded-full bg-amber-500/10 text-amber-500 px-2 py-0.5 text-[10px] font-bold font-mono">
                  {i+1}
                </span>
                <span>{ground}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Investigation Progress */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              3. Summary of Investigation Progress & Outstanding Tasks
            </h3>
          </div>
          <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/10 p-5 font-mono text-xs leading-relaxed text-zinc-750 dark:text-zinc-300 whitespace-pre-wrap">
            {investigationProgress}
          </div>
        </div>

        {/* SHO Remarks & Digital Signature */}
        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              4. IO Remarks & Verification Certification
            </h3>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 p-4 text-xs italic text-zinc-600 dark:text-zinc-400">
              &quot;{officerRemarks}&quot;
            </div>
            <div className="flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50/10 dark:bg-zinc-900/30">
              <div className="w-full border-b border-dashed border-zinc-300 dark:border-zinc-700 min-h-[40px] flex items-end justify-center pb-2">
                <span className="font-mono text-[10px] text-zinc-400 tracking-wider">SHO DIGITAL SIGNATURE</span>
              </div>
              <div className="text-center mt-2.5 space-y-0.5">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Investigating Officer</div>
                <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">CrimeGPT Legal Assistant</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
