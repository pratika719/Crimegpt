"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Brain, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  HelpCircle,
  Gavel,
  FileText,
  Download,
  Eye,
  FolderOpen,
  Cpu,
  Search,
  RefreshCw,
  Clock,
  History,
  Lock,
  BookOpen,
  Pencil,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { generateDocumentAction, logDocumentActivityAction } from "@/actions/document-generation.action";
import { renameDocumentAction, deleteDocumentAction } from "@/actions/document.action";
import { analyzeCaseAction } from "@/actions/legal-analysis.action";
import { useJobPolling } from "@/hooks/use-job-polling";
import { DocumentType } from "@/services/pdf/pdf-template-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

// Import viewers
import FIRDocumentViewer from "./fir-document-viewer";
import InvestigationSummaryViewer from "./investigation-summary-viewer";
import ChargeSheetViewer from "./chargesheet-viewer";
import RemandRequestViewer from "./remand-request-viewer";
import CaseDiaryViewer from "./case-diary-viewer";

interface GeneratedDocument {
  id: string;
  type: string; // "FIR" | "INVESTIGATION_SUMMARY" | "CHARGE_SHEET" | "REMAND_REQUEST" | "CASE_DIARY" | "LEGAL_ANALYSIS"
  title: string;
  content: any;
  version: number;
  createdAt: Date | string;
}

interface AIRequestLog {
  id: string;
  requestType: string;
  prompt: string;
  retrievedContext?: string | null;
  response: string;
  latencyMs?: number | null;
  modelUsed?: string | null;
  createdAt: Date | string;
}

interface CaseAnalysisPanelProps {
  caseId: string;
  initialDocuments: GeneratedDocument[];
  aiRequests?: AIRequestLog[];
  caseTitle?: string;
  caseNumber?: string;
}

interface DocumentTypeMetadata {
  type: string;
  title: string;
  description: string;
  requiresRAG: boolean;
  icon: any;
  colorClass: string;
  bgColorClass: string;
}

const DOCUMENT_TYPES_METADATA: DocumentTypeMetadata[] = [
  {
    type: "LEGAL_ANALYSIS",
    title: "AI Legal Analysis",
    description: "Analyze narrative against laws, assess confidence, and structure legal arguments.",
    requiresRAG: true,
    icon: Brain,
    colorClass: "text-blue-500",
    bgColorClass: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
  },
  {
    type: "FIR",
    title: "First Information Report (FIR)",
    description: "Draft a formal FIR with police station, offenses, suspect details, and SHO remarks.",
    requiresRAG: true,
    icon: Gavel,
    colorClass: "text-indigo-500",
    bgColorClass: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400",
  },
  {
    type: "INVESTIGATION_SUMMARY",
    title: "Investigation Summary",
    description: "Compile narrative facts, evidence assessment, and next steps into a briefing report.",
    requiresRAG: false,
    icon: FileText,
    colorClass: "text-emerald-500",
    bgColorClass: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
  },
  {
    type: "CHARGE_SHEET",
    title: "Charge Sheet (Final Report)",
    description: "Prepare a prosecution-ready Charge Sheet listing accused charges, evidence, and witnesses.",
    requiresRAG: true,
    icon: ShieldAlert,
    colorClass: "text-rose-500",
    bgColorClass: "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400",
  },
  {
    type: "REMAND_REQUEST",
    title: "Remand Request Application",
    description: "Draft a Magistrate court application seeking police or judicial custody for the accused.",
    requiresRAG: false,
    icon: Lock,
    colorClass: "text-amber-500",
    bgColorClass: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
  },
  {
    type: "CASE_DIARY",
    title: "Official Case Diary",
    description: "Compile a chronological, formal police narrative log of the complete case investigation.",
    requiresRAG: false,
    icon: BookOpen,
    colorClass: "text-purple-500",
    bgColorClass: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400",
  },
];

export default function CaseAnalysisPanel({ 
  caseId, 
  initialDocuments = [], 
  aiRequests = [],
  caseTitle = "Case File",
  caseNumber = "PENDING"
}: CaseAnalysisPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeType, setActiveType] = useState<string>("LEGAL_ANALYSIS");
  const activeMeta = DOCUMENT_TYPES_METADATA.find((m) => m.type === activeType)!;
  const ActiveIcon = activeMeta.icon;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [actionType, setActionType] = useState<string | null>(null);
  const [renamingDoc, setRenamingDoc] = useState<GeneratedDocument | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<GeneratedDocument | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  
  // Custom version state for each document type
  const [customVersion, setCustomVersion] = useState<Record<string, number>>({});

  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState<"analyzing" | "generating" | "saving" | "completed">("analyzing");
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Keep track of generating background jobs per document type
  const [generatingJobs, setGeneratingJobs] = useState<Record<string, { jobId: string; queueName: string }>>({});

  const activeJobInfo = generatingJobs[activeType] || null;

  const { status, error, isPolling } = useJobPolling({
    jobId: activeJobInfo?.jobId ?? null,
    queueName: activeJobInfo?.queueName ?? null,
    enabled: Boolean(activeJobInfo),
    intervalMs: 5000,
    // If worker is down, detect within ~3 poll cycles (15s)
    // If generation runs long, hard timeout at 90s
    maxPollingMs: 90_000,
    waitingStallMs: 15_000,
  });

  const isJobRunning =
    status?.state === "pending" ||
    status?.state === "active" ||
    isPolling;

  // Handle completion, failure, and error in polling
  useEffect(() => {
    if (status?.state === "completed") {
      toast.success(`${activeMeta.title} generated successfully!`);
      setGeneratingJobs((prev) => {
        const next = { ...prev };
        delete next[activeType];
        return next;
      });
      setActionType(null);
      router.refresh();
    } else if (status?.state === "failed") {
      const failedMsg = status.failedReason || "Please try again.";
      // Map 429 errors to user-friendly message
      const displayMsg = failedMsg.includes("overloaded")
        ? "AI service is currently overloaded. Please wait a moment and try again."
        : `Generation failed: ${failedMsg}`;
      toast.error(displayMsg);
      setGenerationError(displayMsg);
      setGeneratingJobs((prev) => {
        const next = { ...prev };
        delete next[activeType];
        return next;
      });
      setActionType(null);
      router.refresh();
    } else if (status?.state === "unknown") {
      if (status.failedReason) {
        setGenerationError(status.failedReason);
      }
      setGeneratingJobs((prev) => {
        const next = { ...prev };
        delete next[activeType];
        return next;
      });
      setActionType(null);
    }
  }, [status?.state, status?.failedReason, activeType, router, activeMeta.title]);

  useEffect(() => {
    if (error) {
      setGenerationError(error);
    }
  }, [error]);

  // Clear the persistent error when starting a new generation
  useEffect(() => {
    if (activeJobInfo) {
      setGenerationError(null);
    }
  }, [activeJobInfo]);

  // Keep the isPending transition for the server action (sub-second), but no fake progress bar

  // Filter types based on search and type filter
  const filteredDocTypes = DOCUMENT_TYPES_METADATA.filter((docMeta) => {
    const matchesSearch = docMeta.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          docMeta.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = typeFilter === "ALL" || docMeta.type === typeFilter;
    return matchesSearch && matchesFilter;
  });

  // Find all generated documents of the active type
  const activeTypeDocs = initialDocuments.filter((d) => d.type === activeType);
  
  // Find currently selected version
  const availableVersions = activeTypeDocs.map((d) => d.version).sort((a, b) => b - a);
  const selectedVersion = customVersion[activeType] || (availableVersions[0] || 1);
  const activeDoc = activeTypeDocs.find((d) => d.version === selectedVersion) || activeTypeDocs[0] || null;

  // Set default selected version when active type changes
  useEffect(() => {
    if (availableVersions.length > 0 && !customVersion[activeType]) {
      setCustomVersion((prev) => ({ ...prev, [activeType]: availableVersions[0] }));
    }
  }, [activeType, availableVersions]);

  // Find telemetry log for active document
  const getTelemetryLog = (doc: GeneratedDocument | null) => {
    if (!doc) return null;
    const requestTypeMap: Record<string, string> = {
      FIR: "FIR_GENERATION",
      INVESTIGATION_SUMMARY: "INVESTIGATION_SUMMARY",
      CHARGE_SHEET: "CHARGE_SHEET",
      REMAND_REQUEST: "REMAND_REQUEST_GENERATION",
      CASE_DIARY: "CASE_DIARY_GENERATION",
      LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
    };
    const targetReqType = requestTypeMap[doc.type];
    if (!targetReqType) return null;

    const docTime = new Date(doc.createdAt).getTime();
    let bestLog = null;
    let minDiff = Infinity;

    for (const log of aiRequests) {
      if (log.requestType === targetReqType) {
        const logTime = new Date(log.createdAt).getTime();
        const diff = Math.abs(docTime - logTime);
        if (diff < minDiff) {
          minDiff = diff;
          bestLog = log;
        }
      }
    }
    return bestLog;
  };

  const telemetryLog = getTelemetryLog(activeDoc);

  // Document action trigger
  const handleGenerate = (type: string, isRegen = false) => {
    setGenerationError(null);
    setActionType(isRegen ? "REGENERATE" : "GENERATE");
    startTransition(async () => {
      let response;
      if (type === "LEGAL_ANALYSIS") {
        // Legal analysis runs its own action
        response = await analyzeCaseAction(caseId);
      } else {
        // All other documents use the new Document Engine action
        response = await generateDocumentAction({
          caseId,
          documentType: type as any,
          forceRegenerate: isRegen,
        });
      }

      if (!response.success) {
        const errMsg = (response as any).message || `Failed to generate ${type}.`;
        setGenerationError(errMsg);
        toast.error(errMsg);
        setActionType(null);
      } else {
        if (type === "LEGAL_ANALYSIS") {
          toast.success(`${isRegen ? "Regenerated" : "Generated"} successfully!`);
          router.refresh();
          setActionType(null);
        } else {
          // For BullMQ documents, we receive jobId and queueName
          const jobData = (response as any).data;
          if (jobData && jobData.jobId && jobData.queueName) {
            setGeneratingJobs((prev) => ({
              ...prev,
              [type]: {
                jobId: jobData.jobId,
                queueName: jobData.queueName,
              },
            }));
            toast.info("Document generation started in the background...");
          } else {
            const errMsg = (response as any).message || `Failed to generate ${type}.`;
            toast.error(errMsg);
            setGenerationError(errMsg);
            setActionType(null);
          }
        }
      }
    });
  };

  // PDF Export Trigger
  const handlePDFDownload = async () => {
    if (!activeDoc) return;
    try {
      const { PDFExportService } = await import("@/services/pdf/pdf-export.service");
      PDFExportService.export(
        activeDoc.title,
        activeDoc.type as DocumentType,
        activeDoc.content,
        activeDoc.version,
        new Date(activeDoc.createdAt).toLocaleString(),
        caseNumber,
        caseTitle
      );
      toast.success("PDF generated and download started!");
      // Log the download activity
      await logDocumentActivityAction(
        caseId,
        "DOWNLOAD",
        activeDoc.type,
        activeDoc.title,
        activeDoc.version
      );
      router.refresh();
    } catch (err: any) {
      toast.error("Failed to generate PDF download.");
      console.error(err);
    }
  };

  const openRenameDialog = (doc: GeneratedDocument) => {
    setRenamingDoc(doc);
    setRenameTitle(doc.title);
  };

  const handleRenameDocument = () => {
    if (!renamingDoc || !renameTitle.trim()) return;

    startTransition(async () => {
      const response = await renameDocumentAction(renamingDoc.id, caseId, renameTitle.trim());
      if (response.success) {
        toast.success("Document renamed.");
        setRenamingDoc(null);
        router.refresh();
      } else {
        toast.error(response.message || "Failed to rename document.");
      }
    });
  };

  const handleDeleteDocument = () => {
    if (!deletingDoc) return;

    startTransition(async () => {
      const response = await deleteDocumentAction(deletingDoc.id, caseId);
      if (response.success) {
        toast.success("Generated document deleted.");
        setDeletingDoc(null);
        router.refresh();
      } else {
        toast.error(response.message || "Failed to delete document.");
      }
    });
  };

  const renderConfidenceBadge = (confidence: "HIGH" | "MEDIUM" | "LOW") => {
    const styles = {
      HIGH: "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30",
      MEDIUM: "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30",
      LOW: "bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30",
    };
    const displayConfidence = confidence || "MEDIUM";
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${styles[displayConfidence]}`}>
        {displayConfidence === "HIGH" && <CheckCircle2 className="h-3 w-3" />}
        {displayConfidence === "MEDIUM" && <AlertTriangle className="h-3 w-3" />}
        {displayConfidence === "LOW" && <HelpCircle className="h-3 w-3" />}
        {displayConfidence} CONFIDENCE
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            AI Investigation Document Center
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Generate, preview, version, and export case files and prosecution-ready court documents.
          </p>
        </div>
      </div>

      {/* Persistent error banner */}
      {generationError && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-4 flex items-start gap-3 animate-fade-in">
          <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
              {generationError}
            </p>
          </div>
          <button
            onClick={() => setGenerationError(null)}
            className="text-rose-400 hover:text-rose-600 transition-colors flex-shrink-0"
            aria-label="Dismiss error"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: DOCUMENT NAVIGATION & SEARCH */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
            {/* Search & Filter Controls */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search document type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950/20 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              <button 
                onClick={() => setTypeFilter("ALL")} 
                className={`px-2 py-1 rounded transition-colors ${typeFilter === "ALL" ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
              >
                All
              </button>
              <button 
                onClick={() => setTypeFilter("FIR")} 
                className={`px-2 py-1 rounded transition-colors ${typeFilter === "FIR" ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
              >
                FIR
              </button>
              <button 
                onClick={() => setTypeFilter("LEGAL_ANALYSIS")} 
                className={`px-2 py-1 rounded transition-colors ${typeFilter === "LEGAL_ANALYSIS" ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
              >
                Analysis
              </button>
            </div>

            {/* Document Types List */}
            <div className="space-y-1.5 max-h-[450px] overflow-y-auto">
              {filteredDocTypes.map((docMeta) => {
                const ItemIcon = docMeta.icon;
                const isSelected = activeType === docMeta.type;
                const generatedDocs = initialDocuments.filter((d) => d.type === docMeta.type);
                const hasGenerated = generatedDocs.length > 0;

                return (
                  <button
                    key={docMeta.type}
                    onClick={() => setActiveType(docMeta.type)}
                    className={`w-full flex items-start text-left p-3 rounded-lg border transition-all text-xs relative ${
                      isSelected 
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800/40" 
                        : "border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                    }`}
                  >
                    <div className="mr-3 mt-0.5">
                      <ItemIcon className={`h-4.5 w-4.5 ${docMeta.colorClass}`} />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0 pr-4">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {docMeta.title}
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-2 leading-relaxed">
                        {docMeta.description}
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[9px] font-mono uppercase tracking-wider">
                        {generatingJobs[docMeta.type] ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 animate-pulse">
                            <Loader2 className="h-2.5 w-2.5 animate-spin text-indigo-500" /> Generating...
                          </span>
                        ) : hasGenerated ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ v{generatedDocs.map(d => d.version).sort((a,b)=>b-a)[0]} Ready
                          </span>
                        ) : (
                          <span className="text-zinc-500 dark:text-zinc-400">Not Generated</span>
                        )}
                        {docMeta.requiresRAG && (
                          <span className="rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 px-1 py-0.2">
                            RAG
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredDocTypes.length === 0 && (
                <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 space-y-2">
                  <FolderOpen className="h-8 w-8 mx-auto" />
                  <p className="text-xs">No matching document types found.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DOCUMENT PREVIEW & CONTROL CENTER */}
        <div className="lg:col-span-8 space-y-4">
          {/* Quick-loading state while the server action queues the job */}
          {isPending && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm animate-fade-in">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md animate-pulse" />
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin relative" />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Queuing document generation...
                </p>
              </div>
            </div>
          )}

          {!isPending && (
            <>
              {/* Document Actions & Metadata Header Bar */}
              {activeDoc ? (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  {/* Left Side: Version dropdown */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase">Version:</span>
                    <select
                      value={selectedVersion}
                      disabled={isJobRunning || isPending}
                      onChange={(e) => setCustomVersion((prev) => ({ ...prev, [activeType]: Number(e.target.value) }))}
                      className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono rounded px-2 py-1 focus:outline-none disabled:opacity-50"
                    >
                      {availableVersions.map((v) => (
                        <option key={v} value={v}>
                          Version {v} {v === availableVersions[0] ? "(Latest)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Center/Right Side: Metadata telemetry */}
                  {telemetryLog && (
                    <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-800 pr-4">
                      <div className="flex items-center gap-1">
                        <Cpu className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{telemetryLog.modelUsed || "gemini-2.5-flash"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{telemetryLog.latencyMs ? `${telemetryLog.latencyMs}ms` : "N/A"}</span>
                      </div>
                    </div>
                  )}

                  {/* Right Side: Actions */}
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            disabled={isJobRunning || isPending}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                            aria-label="Document actions"
                          />
                        }
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => openRenameDialog(activeDoc)}>
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Rename Document</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onClick={() => setDeletingDoc(activeDoc)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Document</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                      onClick={() => handleGenerate(activeType, true)}
                      disabled={isJobRunning || isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Regenerate
                    </button>
                    <button
                      onClick={handlePDFDownload}
                      disabled={isJobRunning || isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-900 text-white dark:bg-zinc-200 dark:border-zinc-200 dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </button>
                  </div>
                </div>
              ) : generationError ? (
                /* Persistent Error State */
                <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                        Generation Failed
                      </h4>
                      <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                        {generationError}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerate(activeType, false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try Again
                  </button>
                </div>
              ) : isJobRunning ? (
                /* Un-generated Active Polling State */
                <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                    <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      Drafting {activeMeta.title}...
                    </h3>
                    {activeJobInfo && !status && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Generation started. This may take 30–60 seconds.
                      </p>
                    )}
                    {status?.state === "pending" && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Document generation is queued.
                      </p>
                    )}
                    {status?.state === "active" && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Document is generating in the background.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Un-generated Empty State */
                <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                    <ActiveIcon className={`h-7 w-7 ${activeMeta.colorClass}`} />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      Draft {activeMeta.title}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {activeMeta.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleGenerate(activeType)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity"
                  >
                    <Cpu className="h-4 w-4" />
                    Generate Document
                  </button>
                </div>
              )}

              {/* ACTIVE PREVIEW CONTENT */}
              {activeDoc && (
                <div className="space-y-6">
                  {isJobRunning && (
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-4 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
                      <p className="text-xs text-zinc-800 dark:text-zinc-200">
                        Document is regenerating in the background.
                      </p>
                    </div>
                  )}
                  {generationError && !isJobRunning && (
                    <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                            Generation failed
                          </p>
                          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                            {generationError}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleGenerate(activeType, true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Try Again
                        </button>
                        <button
                          onClick={() => setGenerationError(null)}
                          className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Legal Analysis View */}
                  {activeDoc.type === "LEGAL_ANALYSIS" && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden animate-fadeIn">
                      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                          <Brain className="h-4.5 w-4.5 text-zinc-500" />
                          <span className="text-xs font-mono font-semibold uppercase tracking-wider">AI Legal Analysis Report</span>
                        </div>
                        {renderConfidenceBadge(activeDoc.content.confidence)}
                      </div>                      <div className="p-6 md:p-8 space-y-6">
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-mono">
                            Incident Abstract
                          </h4>
                          <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 font-sans font-medium">
                            {activeDoc.content.summary}
                          </p>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                          <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-mono">
                            Applicable Offenses
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {activeDoc.content.applicableSections?.map((sec: any, idx: number) => (
                              <div 
                                key={idx}
                                className="rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/20 p-4 space-y-2.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
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

                        <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                          <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-mono">
                            Detailed Legal Reasoning
                          </h4>
                          <div className="rounded-lg border border-zinc-100 dark:border-zinc-800/40 bg-zinc-50/10 p-5 font-sans text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                            {activeDoc.content.reasoning}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FIR View */}
                  {activeDoc.type === "FIR" && (
                    <FIRDocumentViewer 
                      fir={activeDoc.content} 
                      version={activeDoc.version} 
                      createdAt={new Date(activeDoc.createdAt).toLocaleString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                  )}

                  {/* Investigation Summary View */}
                  {activeDoc.type === "INVESTIGATION_SUMMARY" && (
                    <InvestigationSummaryViewer 
                      summary={activeDoc.content}
                      version={activeDoc.version}
                      createdAt={new Date(activeDoc.createdAt).toLocaleString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                  )}

                  {/* Charge Sheet View */}
                  {activeDoc.type === "CHARGE_SHEET" && (
                    <ChargeSheetViewer 
                      chargesheet={activeDoc.content}
                      version={activeDoc.version}
                      createdAt={new Date(activeDoc.createdAt).toLocaleString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                  )}

                  {/* Remand Request View */}
                  {activeDoc.type === "REMAND_REQUEST" && (
                    <RemandRequestViewer 
                      remandRequest={activeDoc.content}
                      version={activeDoc.version}
                      createdAt={new Date(activeDoc.createdAt).toLocaleString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                  )}

                  {/* Case Diary View */}
                  {activeDoc.type === "CASE_DIARY" && (
                    <CaseDiaryViewer 
                      diary={activeDoc.content}
                      version={activeDoc.version}
                      createdAt={new Date(activeDoc.createdAt).toLocaleString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={!!renamingDoc} onOpenChange={(open) => !open && setRenamingDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Generated Document</DialogTitle>
            <DialogDescription>
              Update the stored document title. Existing content will not be regenerated.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            disabled={isPending}
            maxLength={200}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setRenamingDoc(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending || !renameTitle.trim()}
              onClick={handleRenameDocument}
              className="text-xs"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingDoc}
        onOpenChange={(open) => {
          if (!open && !isPending) setDeletingDoc(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Generated Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The generated document will be
              removed, but investigation data will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Deleting...
                </>
              ) : (
                "Delete Document"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
