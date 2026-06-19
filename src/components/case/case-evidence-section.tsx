"use client";

import { useState } from "react";
import { 
  Paperclip, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileCode, 
  FileBox,
  Plus, 
  Info,
  Calendar,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EvidenceFormDialog } from "./evidence-form-dialog";
import EvidenceDetailsSheet from "./evidence-details-sheet";

interface Evidence {
  id: string;
  title: string;
  type: "DOCUMENT" | "IMAGE" | "VIDEO" | "AUDIO" | "SCREENSHOT" | "LOG_FILE" | "OTHER";
  description?: string | null;
  notes?: string | null;
  fileUrl?: string | null;
  createdAt: Date | string;
}

interface CaseEvidenceSectionProps {
  caseId: string;
  initialEvidence: Evidence[];
}

export default function CaseEvidenceSection({ caseId, initialEvidence }: CaseEvidenceSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState<Evidence | null>(null);

  const handleAddEvidence = () => {
    setActiveEvidence(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (item: Evidence) => {
    setActiveEvidence(item);
    setIsDetailsOpen(true);
  };

  const handleEditTrigger = (item: Evidence) => {
    setIsDetailsOpen(false);
    // Timeout to let drawer finish sliding back before opening form modal
    setTimeout(() => {
      setActiveEvidence(item);
      setIsFormOpen(true);
    }, 200);
  };

  const getEvidenceConfig = (type: string) => {
    const configs: Record<string, { icon: any; colorClass: string; label: string }> = {
      DOCUMENT: {
        icon: FileText,
        colorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
        label: "Document File",
      },
      IMAGE: {
        icon: FileImage,
        colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
        label: "Image Asset",
      },
      VIDEO: {
        icon: FileVideo,
        colorClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30",
        label: "Video Recording",
      },
      AUDIO: {
        icon: FileAudio,
        colorClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30",
        label: "Audio Recording",
      },
      SCREENSHOT: {
        icon: FileImage,
        colorClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30",
        label: "Screenshot",
      },
      LOG_FILE: {
        icon: FileCode,
        colorClass: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/30",
        label: "System Log File",
      },
      OTHER: {
        icon: FileBox,
        colorClass: "bg-zinc-550/10 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-350 dark:border-zinc-700",
        label: "Evidence Asset",
      },
    };

    return configs[type] || {
      icon: FileBox,
      colorClass: "bg-zinc-550/10 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-350 dark:border-zinc-700",
      label: "Evidence Asset",
    };
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Title Strip */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4.5 w-4.5 text-zinc-500" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Case Evidence Files & Assets
          </h2>
        </div>

        <Button 
          onClick={handleAddEvidence}
          className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-zinc-200 dark:border-zinc-855 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 h-auto shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Register Evidence
        </Button>
      </div>

      {/* Grid of Evidence Cards */}
      {initialEvidence.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-250 dark:border-zinc-800 bg-zinc-50/10 p-8 text-center flex flex-col items-center justify-center space-y-4">
          <Paperclip className="h-10 w-10 text-zinc-350 dark:text-zinc-650 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 font-sans">Evidentiary records missing</h4>
            <p className="text-xs text-zinc-455 dark:text-zinc-500 max-w-sm mx-auto">
              Add call logs, CCTV footage, documents, and screenshots to establish a detailed evidence profile.
            </p>
          </div>
          <Button 
            onClick={handleAddEvidence}
            className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer h-9 px-4 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Populate Evidence File
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {initialEvidence.map((item) => {
            const { icon: ConfigIcon, colorClass, label } = getEvidenceConfig(item.type);
            const dateStr = new Date(item.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            });

            return (
              <div 
                key={item.id}
                onClick={() => handleViewDetails(item)}
                className="group relative rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 p-4 space-y-3.5 shadow-sm transition-all hover:shadow-md hover:border-zinc-350 dark:hover:border-zinc-750 cursor-pointer"
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${colorClass}`}>
                    <ConfigIcon className="h-3 w-3" />
                    {label.split(" ")[0]}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-mono">{dateStr}</span>
                </div>

                {/* Title and Description */}
                <div className="space-y-1">
                  <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 font-sans tracking-tight line-clamp-1 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-zinc-450 dark:text-zinc-500 line-clamp-2 leading-relaxed">
                    {item.description || "No description provided."}
                  </p>
                </div>

                {/* Footer mock upload indicator */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/40 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Info className="h-3 w-3 text-zinc-350" /> Detail Record
                  </span>
                  {item.fileUrl && (
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-0.5">
                      File linked <ExternalLink className="h-2.5 w-2.5 animate-pulse" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <EvidenceFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        caseId={caseId}
        evidence={activeEvidence}
      />

      {/* Details Side-Drawer Sheet */}
      <EvidenceDetailsSheet
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        evidence={activeEvidence}
        caseId={caseId}
        onEditTrigger={handleEditTrigger}
      />
    </div>
  );
}
