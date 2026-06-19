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
  FileDown
} from "lucide-react";
import { toast } from "sonner";
import { generateDocumentAction, logDocumentActivityAction } from "@/actions/document-generation.action";
import { analyzeCaseAction } from "@/actions/legal-analysis.action";
import { DocumentType } from "@/services/pdf/pdf-template-registry";

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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [actionType, setActionType] = useState<string | null>(null);
  
  // Custom version state for each document type
  const [customVersion, setCustomVersion] = useState<Record<string, number>>({});

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
    setActionType(isRegen ? "REGENERATE" : "GENERATE");
    startTransition(async () => {
      let response;
      if (type === "LEGAL_ANALYSIS") {
        // Legal analysis runs its own action
        response = await analyzeCaseAction(caseId);
      } else {
        // All other documents use the new Document Engine action
        response = await generateDocumentAction(caseId, type, isRegen);
      }

      if (!response.success) {
        toast.error((response as any).message || `Failed to generate ${type}.`);
      } else {
        toast.success(`${isRegen ? "Regenerated" : "Generated"} successfully!`);
        // Reset version select to latest
        const successResp = response as { success: true; version?: number };
        if (successResp.version) {
          setCustomVersion((prev) => ({ ...prev, [type]: successResp.version! }));
        }
        router.refresh();
      }
      setActionType(null);
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

  const activeMeta = DOCUMENT_TYPES_METADATA.find((m) => m.type === activeType)!;
  const ActiveIcon = activeMeta.icon;

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

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: DOCUMENT NAVIGATION & SEARCH */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
            {/* Search & Filter Controls */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search document type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950/20 text-xs text-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              <button 
                onClick={() => setTypeFilter("ALL")} 
                className={`px-2 py-1 rounded transition-colors ${typeFilter === "ALL" ? "bg-zinc-150 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "hover:bg-zinc-50 dark:hover:bg-zinc-850"}`}
              >
                All
              </button>
              <button 
                onClick={() => setTypeFilter("FIR")} 
                className={`px-2 py-1 rounded transition-colors ${typeFilter === "FIR" ? "bg-zinc-150 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "hover:bg-zinc-50 dark:hover:bg-zinc-850"}`}
              >
                FIR
              </button>
              <button 
                onClick={() => setTypeFilter("LEGAL_ANALYSIS")} 
                className={`px-2 py-1 rounded transition-colors ${typeFilter === "LEGAL_ANALYSIS" ? "bg-zinc-150 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "hover:bg-zinc-50 dark:hover:bg-zinc-850"}`}
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
                        : "border-zinc-150 dark:border-zinc-800/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30"
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
                        {hasGenerated ? (
                          <span className="text-emerald-500 font-bold">
                            ✓ v{generatedDocs.map(d => d.version).sort((a,b)=>b-a)[0]} Ready
                          </span>
                        ) : (
                          <span className="text-zinc-400">Not Generated</span>
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
                <div className="p-8 text-center text-zinc-400 dark:text-zinc-650 space-y-2">
                  <FolderOpen className="h-8 w-8 mx-auto" />
                  <p className="text-xs">No matching document types found.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DOCUMENT PREVIEW & CONTROL CENTER */}
        <div className="lg:col-span-8 space-y-4">
          {/* Active Generation Loading State */}
          {isPending && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/10 p-12 flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
              <Cpu className="h-10 w-10 text-zinc-500 dark:text-zinc-400 animate-spin" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {actionType === "REGENERATE" ? "Regenerating Document..." : "Drafting Police Document..."}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                  Analyzing structured context pool, running Gemini {activeMeta.requiresRAG ? "with vector laws" : ""} reasoning, and validating output schema.
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
                    <span className="text-xs font-mono font-bold text-zinc-400 uppercase">Version:</span>
                    <select
                      value={selectedVersion}
                      onChange={(e) => setCustomVersion((prev) => ({ ...prev, [activeType]: Number(e.target.value) }))}
                      className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono rounded px-2 py-1 focus:outline-none"
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
                    <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-400 dark:text-zinc-550 border-r border-zinc-200 dark:border-zinc-800 pr-4">
                      <div className="flex items-center gap-1">
                        <Cpu className="h-3.5 w-3.5 text-zinc-450" />
                        <span>{telemetryLog.modelUsed || "gemini-2.5-flash"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-zinc-450" />
                        <span>{telemetryLog.latencyMs ? `${telemetryLog.latencyMs}ms` : "N/A"}</span>
                      </div>
                    </div>
                  )}

                  {/* Right Side: Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerate(activeType, true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate
                    </button>
                    <button
                      onClick={handlePDFDownload}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-900 text-white dark:bg-zinc-150 dark:border-zinc-150 dark:text-zinc-900 hover:opacity-90 transition-opacity"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </button>
                  </div>
                </div>
              ) : (
                /* Un-generated Empty State */
                <div className="rounded-xl border border-dashed border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                    <ActiveIcon className={`h-7 w-7 ${activeMeta.colorClass}`} />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      Draft {activeMeta.title}
                    </h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
                      {activeMeta.description} Use CrimeGPT's Unified Case Data Pool to compile a validated, structured legal draft.
                    </p>
                  </div>
                  <button
                    onClick={() => handleGenerate(activeType, false)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity"
                  >
                    <Cpu className="h-4 w-4 animate-pulse" />
                    Generate Document
                  </button>
                </div>
              )}

              {/* ACTIVE PREVIEW CONTENT */}
              {activeDoc && (
                <div className="space-y-6">
                  {/* Legal Analysis View */}
                  {activeDoc.type === "LEGAL_ANALYSIS" && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden animate-fadeIn">
                      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                          <Brain className="h-4.5 w-4.5 text-zinc-550" />
                          <span className="text-xs font-mono font-semibold uppercase tracking-wider">AI Legal Analysis Report</span>
                        </div>
                        {renderConfidenceBadge(activeDoc.content.confidence)}
                      </div>

                      <div className="p-6 md:p-8 space-y-6">
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                            Incident Abstract
                          </h4>
                          <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 font-sans font-medium">
                            {activeDoc.content.summary}
                          </p>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                          <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                            Applicable Offenses
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {activeDoc.content.applicableSections?.map((sec: any, idx: number) => (
                              <div 
                                key={idx}
                                className="rounded-lg border border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/20 p-4 space-y-2.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                              >
                                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                                  <Gavel className="h-4 w-4 text-zinc-400 dark:text-zinc-550" />
                                  <span className="text-xs font-mono font-bold">{sec.section}</span>
                                </div>
                                <p className="text-xs leading-relaxed text-zinc-650 dark:text-zinc-400">
                                  {sec.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                          <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
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
    </div>
  );
}
