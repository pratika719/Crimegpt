"use client";

import { useState } from "react";
import { 
  Plus, 
  Edit3, 
  MapPin, 
  UserCheck, 
  Shield, 
  FolderLock,
  Layers,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { CaseMetadataForm } from "./case-metadata-form";

interface CaseMetadata {
  id: string;
  incidentDate?: Date | string | null;
  incidentTime?: string | null;
  incidentLocation?: string | null;
  victimName?: string | null;
  victimStatement?: string | null;
  suspectName?: string | null;
  suspectDescription?: string | null;
  witnessInformation?: string | null;
  evidenceSummary?: string | null;
  officerNotes?: string | null;
}

interface CaseMetadataSectionProps {
  caseId: string;
  metadata: CaseMetadata | null;
}

export default function CaseMetadataSection({ caseId, metadata }: CaseMetadataSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formattedDate = metadata?.incidentDate 
    ? new Date(metadata.incidentDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-4">
      {/* Section Title & Edit trigger */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4.5 w-4.5 text-zinc-500" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Investigation Metadata Profile
          </h2>
        </div>

        {/* Dialog for editing/adding metadata */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={
            <Button className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 h-auto" />
          }>
            {metadata ? (
              <>
                <Edit3 className="h-3.5 w-3.5" />
                Edit Metadata
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Add Case Metadata
              </>
            )}
          </DialogTrigger>

          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
                {metadata ? "Update Investigation Metadata" : "Establish Investigation Metadata"}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 dark:text-zinc-500">
                Log structured details regarding the incident, involved persons, witness summaries, and evidentiary files to enhance AI contexts.
              </DialogDescription>
            </DialogHeader>
            <CaseMetadataForm caseId={caseId} initialData={metadata} onSuccess={() => setIsOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Onboarding / Empty State */}
      {!metadata ? (
        <div className="rounded-xl border border-dashed border-zinc-250 dark:border-zinc-800 bg-zinc-50/10 p-8 text-center flex flex-col items-center justify-center space-y-4">
          <FolderLock className="h-10 w-10 text-zinc-350 dark:text-zinc-650" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 font-sans">Structured metadata profile missing</h4>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm mx-auto">
              Adding incident locations, suspect details, evidence logs, and witness details will enrich AI Legal Analysis, FIR compilation, and Investigation Summaries.
            </p>
          </div>
          <Button 
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer h-9 px-4 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Populate Case Metadata
          </Button>
        </div>
      ) : (
        /* Metadata Profile summary cards */
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Card 1: Incident Location & Time */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 p-4 space-y-3.5 shadow-sm transition-all hover:shadow-md">
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-zinc-400" />
              Incident Details
            </h4>
            <div className="space-y-2.5 font-sans text-xs">
              <div className="flex justify-between border-b border-zinc-50 dark:border-zinc-800/40 pb-2">
                <span className="text-zinc-400">Occurrence Date:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">{formattedDate || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-50 dark:border-zinc-800/40 pb-2">
                <span className="text-zinc-400">Occurrence Time:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">{metadata.incidentTime || "N/A"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400">Incident Location:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">{metadata.incidentLocation || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Involved Parties */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 p-4 space-y-3.5 shadow-sm transition-all hover:shadow-md">
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-zinc-400" />
              Key Parties Involved
            </h4>
            <div className="space-y-2.5 font-sans text-xs">
              <div className="flex justify-between border-b border-zinc-50 dark:border-zinc-800/40 pb-2">
                <span className="text-zinc-400">Victim / Complainant:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">{metadata.victimName || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-50 dark:border-zinc-800/40 pb-2">
                <span className="text-zinc-400">Suspect / Accused:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">{metadata.suspectName || "Unknown"}</span>
              </div>
              {metadata.suspectDescription && (
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-400">Suspect Profile:</span>
                  <span className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-[11px] line-clamp-2">{metadata.suspectDescription}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Evidence & Statements */}
          <div className="sm:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-sm transition-all hover:shadow-md">
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-zinc-400" />
              Evidentiary Files & Witness logs
            </h4>
            <div className="grid gap-4 md:grid-cols-3 font-sans text-xs">
              <div className="space-y-1 md:border-r md:border-zinc-100 dark:md:border-zinc-800/60 md:pr-4">
                <span className="block text-[10px] font-semibold text-zinc-450 uppercase tracking-wider font-mono">Victim Statement Summary</span>
                <p className="text-zinc-650 dark:text-zinc-450 leading-relaxed text-[11px] line-clamp-3">{metadata.victimStatement || "No statement logged."}</p>
              </div>
              <div className="space-y-1 md:border-r md:border-zinc-100 dark:md:border-zinc-800/60 md:px-4">
                <span className="block text-[10px] font-semibold text-zinc-450 uppercase tracking-wider font-mono">Witness Records</span>
                <p className="text-zinc-650 dark:text-zinc-450 leading-relaxed text-[11px] line-clamp-3">{metadata.witnessInformation || "No witness details logged."}</p>
              </div>
              <div className="space-y-1 md:pl-4">
                <span className="block text-[10px] font-semibold text-zinc-450 uppercase tracking-wider font-mono">Evidence Checklist</span>
                <p className="text-zinc-650 dark:text-zinc-450 leading-relaxed text-[11px] line-clamp-3">{metadata.evidenceSummary || "No evidence checklists compiled."}</p>
              </div>
            </div>
          </div>

          {/* Card 4: Officer Notes */}
          {metadata.officerNotes && (
            <div className="sm:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50/10 p-5 space-y-2">
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-zinc-400" />
                Station House Officer Notes
              </h4>
              <p className="text-xs italic leading-relaxed text-zinc-600 dark:text-zinc-400 font-sans">
                &quot;{metadata.officerNotes}&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
