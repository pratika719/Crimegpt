"use client";

import { useEffect, useState, useTransition } from "react";
import { 
  X, 
  Calendar, 
  Clock, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileCode, 
  FileBox,
  Download, 
  ExternalLink,
  Edit3, 
  Trash2, 
  Loader2,
  Paperclip
} from "lucide-react";
import { deleteEvidenceAction } from "@/actions/evidence.action";
import { toast } from "sonner";

interface Evidence {
  id: string;
  title: string;
  type: "DOCUMENT" | "IMAGE" | "VIDEO" | "AUDIO" | "SCREENSHOT" | "LOG_FILE" | "OTHER";
  description?: string | null;
  notes?: string | null;
  fileUrl?: string | null;
  createdAt: Date | string;
}

interface EvidenceDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: Evidence | null;
  caseId: string;
  onEditTrigger: (evidence: Evidence) => void;
}

export default function EvidenceDetailsSheet({
  isOpen,
  onClose,
  evidence,
  caseId,
  onEditTrigger,
}: EvidenceDetailsSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);

  // Animate drawer slide-in
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      // Small delay to ensure smooth entry animation
      timer = setTimeout(() => setIsMounted(true), 10);
    } else {
      timer = setTimeout(() => setIsMounted(false), 200);
    }
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen && !isMounted) return null;

  const handleDelete = () => {
    if (!evidence) return;
    if (!confirm(`Are you sure you want to remove the evidence record "${evidence.title}" from this case dossier?`)) {
      return;
    }

    startTransition(async () => {
      const response = await deleteEvidenceAction(evidence.id, caseId);
      if (!response.success) {
        toast.error(response.message || "Failed to remove evidence record.");
      } else {
        toast.success(`Removed evidence record: ${evidence.title}`);
        onClose();
      }
    });
  };

  const getEvidenceStyles = (type: string) => {
    const maps: Record<string, { icon: any; colorClass: string; label: string }> = {
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
        colorClass: "bg-zinc-550/10 text-zinc-700 border-zinc-200 dark:bg-zinc-805 dark:text-zinc-350 dark:border-zinc-700",
        label: "Evidence Asset",
      },
    };

    return maps[type] || {
      icon: FileBox,
      colorClass: "bg-zinc-550/10 text-zinc-700 border-zinc-200 dark:bg-zinc-805 dark:text-zinc-350 dark:border-zinc-700",
      label: "Evidence Asset",
    };
  };

  const { icon: TypeIcon, colorClass: badgeColor, label: typeLabel } = evidence 
    ? getEvidenceStyles(evidence.type)
    : { icon: FileBox, colorClass: "", label: "" };

  const formattedDate = evidence?.createdAt
    ? new Date(evidence.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className={`absolute inset-0 bg-zinc-950/45 dark:bg-zinc-950/65 backdrop-blur-xs transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer Panel */}
      <div 
        className={`relative w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 h-full flex flex-col shadow-2xl transition-transform duration-200 ease-in-out transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header Strip */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-350">
            <Paperclip className="h-4.5 w-4.5 text-zinc-500" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Evidence Dossier Record</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable details */}
        {evidence && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & Badge */}
            <div className="space-y-3">
              <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase ${badgeColor}`}>
                <TypeIcon className="h-3.5 w-3.5" />
                {typeLabel}
              </span>
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans leading-snug">
                {evidence.title}
              </h3>
            </div>

            {/* Registration Date */}
            <div className="flex flex-col gap-1 text-[11px] font-mono text-zinc-400 dark:text-zinc-500 border-y border-zinc-100 dark:border-zinc-800/60 py-3.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Date Registered: {formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Asset Reference ID: {evidence.id.toUpperCase()}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Asset Description & Narrative
              </h4>
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800/40 bg-zinc-50/10 p-4 font-sans text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {evidence.description || "No description logged for this evidence record."}
              </div>
            </div>

            {/* Mock Storage File Asset details */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Evidentiary File Attachment
              </h4>
              {evidence.fileUrl ? (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 p-4 flex items-center justify-between gap-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="h-5 w-5 text-zinc-500" />
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 font-sans truncate leading-none mb-1">
                        {evidence.fileUrl.split("/").pop()}
                      </span>
                      <span className="block text-[9px] font-mono text-zinc-450 truncate">
                        {evidence.fileUrl}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button 
                      onClick={() => toast.info(`Download action triggered for "${evidence.fileUrl?.split("/").pop()}" (Simulated)`)}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                      title="Download Asset"
                    >
                      <Download className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-center py-6 text-xs text-zinc-400 dark:text-zinc-550 font-sans italic">
                  No linked file attachment found. Edit evidence to associate a mock storage link.
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Chain of Custody & Security Remarks
              </h4>
              <p className="text-xs font-sans leading-relaxed text-zinc-650 dark:text-zinc-400 bg-zinc-50/20 dark:bg-zinc-950/20 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800/40">
                {evidence.notes || "No custody notes or internal security remarks compiled."}
              </p>
            </div>
          </div>
        )}

        {/* Footer controls */}
        {evidence && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 mt-auto">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-red-200 dark:border-red-950/20 text-red-600 dark:text-red-400 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/10 px-4 py-2 rounded-lg transition-all h-9"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete Record
            </button>

            <button
              onClick={() => onEditTrigger(evidence)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-4 py-2 rounded-lg transition-all h-9"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Evidence
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
