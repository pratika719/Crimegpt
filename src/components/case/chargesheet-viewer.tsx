"use client";

import { 
  FileText, 
  Users, 
  ShieldAlert, 
  ClipboardList, 
  Briefcase, 
  Search, 
  UserCheck 
} from "lucide-react";
import { ChargeSheetOutput } from "@/schema/chargesheet.schema";

interface ChargeSheetViewerProps {
  chargesheet: ChargeSheetOutput;
  version: number;
  createdAt: string;
}

export default function ChargeSheetViewer({ chargesheet, version, createdAt }: ChargeSheetViewerProps) {
  const { caseDetails, accusedList, briefFacts, evidenceCollected, witnessStatements, finalConclusion, officerRemarks } = chargesheet;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-zinc-950 px-6 py-6 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-800 text-white gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-inner">
            <ShieldAlert className="h-6 w-6 text-red-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest font-mono text-zinc-400 uppercase">
              Prosecution Charge Sheet
            </h2>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-50">
              FORMAL CHARGE SHEET - v{version}
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end text-[11px] font-mono text-zinc-400 gap-1">
          <div>DOCUMENT ID: CS-V{version}</div>
          <div>GENERATED: {createdAt}</div>
          <div className="rounded bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 mt-1 font-semibold uppercase tracking-wider text-[9px]">
            SUBMISSION TO COURT ONLY
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* Case Details Box */}
        <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-5 space-y-3">
          <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
            Case Details (U/S 173 CrPC)
          </h3>
          <div className="grid gap-4 sm:grid-cols-4 text-xs font-mono">
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
            <div>
              <span className="block text-zinc-400 dark:text-zinc-500 mb-0.5">REGISTRATION DATE</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{caseDetails.dateOfRegistration}</span>
            </div>
          </div>
        </div>

        {/* Accused List Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              1. Details of the Accused Persons
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {accusedList.map((accused, idx) => (
              <div 
                key={idx}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{accused.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                    accused.arrestStatus.toLowerCase().includes("arrested") || accused.arrestStatus.toLowerCase().includes("custody")
                      ? "bg-red-50 text-red-700 border-red-200/50 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/30"
                      : "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30"
                  }`}>
                    {accused.arrestStatus}
                  </span>
                </div>
                {accused.bailDetails && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-350">Bail:</span> {accused.bailDetails}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {accused.applicableSections.map((sec, i) => (
                    <span 
                      key={i}
                      className="rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300"
                    >
                      {sec}
                    </span>
                  ))}
                </div>
                <div className="rounded bg-zinc-50 dark:bg-zinc-950/30 p-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">Evidence Summary:</span>
                  {accused.evidenceLinks}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brief Facts */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              2. Brief Facts Established During Investigation
            </h3>
          </div>
          <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/10 p-5 font-mono text-xs leading-relaxed text-zinc-750 dark:text-zinc-300 whitespace-pre-wrap">
            {briefFacts}
          </div>
        </div>

        {/* Evidence Collected */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Search className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              3. Summary of Evidence Collected
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Physical */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/10 p-4 space-y-2.5">
              <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-350 block border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
                Physical Evidence
              </span>
              {evidenceCollected.physicalEvidence.length === 0 ? (
                <span className="text-xs italic text-zinc-400">None recorded.</span>
              ) : (
                <ul className="text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                  {evidenceCollected.physicalEvidence.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Documentary */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/10 p-4 space-y-2.5">
              <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-350 block border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
                Documentary Evidence
              </span>
              {evidenceCollected.documentaryEvidence.length === 0 ? (
                <span className="text-xs italic text-zinc-400">None recorded.</span>
              ) : (
                <ul className="text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                  {evidenceCollected.documentaryEvidence.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Scientific/Medical */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/10 p-4 space-y-2.5">
              <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-350 block border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
                Scientific / Medical Evidence
              </span>
              {evidenceCollected.scientificOrMedicalEvidence.length === 0 ? (
                <span className="text-xs italic text-zinc-400">None recorded.</span>
              ) : (
                <ul className="text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                  {evidenceCollected.scientificOrMedicalEvidence.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Witness Statements */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              4. Witness Statements Summary
            </h3>
          </div>
          <div className="space-y-3">
            {witnessStatements.map((witness, idx) => (
              <div 
                key={idx}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/10 p-4 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-1">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{witness.name}</span>
                  {witness.credibilityScore && (
                    <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">
                      CREDIBILITY: {witness.credibilityScore.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-zinc-600 dark:text-zinc-350 leading-relaxed italic">
                  &quot;{witness.summaryOfStatement}&quot;
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Conclusion */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              5. Final Recommendation / Prosecution Conclusion
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 border-l-2 border-zinc-900 dark:border-zinc-300 pl-4 py-1 font-medium whitespace-pre-wrap">
            {finalConclusion}
          </p>
        </div>

        {/* SHO Remarks & Digital Signature */}
        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              6. SHO Remarks & Court Submission Endorsement
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
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Station House Officer</div>
                <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">CrimeGPT Legal Assistant</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
