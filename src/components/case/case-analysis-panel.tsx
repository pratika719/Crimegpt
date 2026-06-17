"use client";

import { useState, useTransition, useEffect } from "react";
import { analyzeCaseAction } from "@/actions/legal-analysis.action";
import { generateFIRAction } from "@/actions/fir.action";
import { 
  Play, 
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
  Cpu
} from "lucide-react";
import { toast } from "sonner";
import FIRDocumentViewer from "./fir-document-viewer";

interface GeneratedDocument {
  id: string;
  type: string; // "FIR" | "LEGAL_ANALYSIS"
  title: string;
  content: any; // Stored as Json, parsed to object
  version: number;
  createdAt: Date | string;
}

interface CaseAnalysisPanelProps {
  caseId: string;
  initialDocuments: GeneratedDocument[];
}

export default function CaseAnalysisPanel({ caseId, initialDocuments }: CaseAnalysisPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<"ANALYSIS" | "FIR" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    initialDocuments.length > 0 ? initialDocuments[0].id : null
  );
  
  // Track document list length changes to auto-select newly generated documents
  const [prevDocCount, setPrevDocCount] = useState(initialDocuments.length);

  useEffect(() => {
    if (initialDocuments.length > prevDocCount) {
      // A new document was generated, auto-select it
      if (initialDocuments[0]) {
        setSelectedDocId(initialDocuments[0].id);
      }
      setPrevDocCount(initialDocuments.length);
    } else if (initialDocuments.length !== prevDocCount) {
      setPrevDocCount(initialDocuments.length);
    }
  }, [initialDocuments, prevDocCount]);

  const handleRunAnalysis = () => {
    setError(null);
    setActionType("ANALYSIS");
    startTransition(async () => {
      const response = await analyzeCaseAction(caseId);
      if (!response.success) {
        setError(response.message || "Failed to analyze case narrative.");
        toast.error(response.message || "Failed to analyze case.");
      } else {
        toast.success("AI Legal Analysis completed successfully!");
      }
      setActionType(null);
    });
  };

  const handleGenerateFIR = () => {
    setError(null);
    setActionType("FIR");
    startTransition(async () => {
      const response = await generateFIRAction(caseId);
      if (!response.success) {
        setError(response.message || "Failed to generate First Information Report.");
        toast.error(response.message || "Failed to generate FIR.");
      } else {
        toast.success("First Information Report (FIR) generated successfully!");
      }
      setActionType(null);
    });
  };

  // Find the currently selected document
  const selectedDoc = initialDocuments.find((d) => d.id === selectedDocId) || null;

  // Render the confidence badge for Legal Analysis
  const renderConfidenceBadge = (confidence: "HIGH" | "MEDIUM" | "LOW") => {
    const styles = {
      HIGH: "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30",
      MEDIUM: "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30",
      LOW: "bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30",
    };

    const displayConfidence = confidence || "MEDIUM";

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[displayConfidence]}`}>
        {displayConfidence === "HIGH" && <CheckCircle2 className="h-3 w-3" />}
        {displayConfidence === "MEDIUM" && <AlertTriangle className="h-3 w-3" />}
        {displayConfidence === "LOW" && <HelpCircle className="h-3 w-3" />}
        {displayConfidence} CONFIDENCE
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* AI Orchestration & Generation Control Hub */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
            AI Document Generation Console
          </h3>
          <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[9px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
            RAG Pipeline v2.1
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Legal Analysis Button */}
          <button
            onClick={handleRunAnalysis}
            disabled={isPending}
            className={`flex flex-col items-start text-left rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 p-4 transition-all shadow-sm relative overflow-hidden group ${
              isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1 text-zinc-800 dark:text-zinc-200">
              {isPending && actionType === "ANALYSIS" ? (
                <Loader2 className="h-4.5 w-4.5 text-blue-500 animate-spin" />
              ) : (
                <Brain className="h-4.5 w-4.5 text-zinc-400 group-hover:text-blue-500 transition-colors" />
              )}
              <span className="font-semibold text-xs font-sans">Run Legal Analysis</span>
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Analyze crime narrative against IPC vectors, assess confidence levels, and structure legal arguments.
            </p>
            {isPending && actionType === "ANALYSIS" && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse" />
            )}
          </button>

          {/* Generate FIR Button */}
          <button
            onClick={handleGenerateFIR}
            disabled={isPending}
            className={`flex flex-col items-start text-left rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 p-4 transition-all shadow-sm relative overflow-hidden group ${
              isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1 text-zinc-800 dark:text-zinc-200">
              {isPending && actionType === "FIR" ? (
                <Loader2 className="h-4.5 w-4.5 text-amber-500 animate-spin" />
              ) : (
                <Gavel className="h-4.5 w-4.5 text-zinc-400 group-hover:text-amber-500 transition-colors" />
              )}
              <span className="font-semibold text-xs font-sans">Generate FIR Document</span>
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Construct a detailed First Information Report with formal police remarks, suspects, and offenses list.
            </p>
            {isPending && actionType === "FIR" && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-red-500 animate-pulse" />
            )}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200/50 bg-red-50/20 dark:bg-red-950/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2 animate-fadeIn">
            <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* RAG Progress Loading Skeleton */}
      {isPending && (
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/10 p-8 flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
          <Cpu className="h-9 w-9 text-zinc-400 animate-spin text-zinc-500 dark:text-zinc-400" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {actionType === "ANALYSIS" ? "Generating Legal Analysis..." : "Drafting Police FIR..."}
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
              Embedding narrative details, querying Neon PostgreSQL vector indexes, and utilizing Gemini 2.5 Flash for verification.
            </p>
          </div>
        </div>
      )}

      {/* Generated Documents Table Section */}
      {!isPending && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-zinc-500" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Generated Documents Dossier
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">
              {initialDocuments.length} Documents Created
            </span>
          </div>

          {initialDocuments.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
              <FolderOpen className="h-10 w-10 text-zinc-300 dark:text-zinc-650" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No generated documents yet</h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto">
                  Run AI legal analysis or draft an FIR document using the console above to begin compiling records.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-50/20 dark:bg-zinc-950/10">
                    <th className="py-3 px-6 font-semibold">Document Title / Type</th>
                    <th className="py-3 px-4 font-semibold text-center">Version</th>
                    <th className="py-3 px-4 font-semibold">Date Created</th>
                    <th className="py-3 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {initialDocuments.map((doc) => {
                    const isSelected = doc.id === selectedDocId;
                    const dateFormatted = new Date(doc.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr 
                        key={doc.id}
                        className={`transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-850 ${
                          isSelected ? "bg-zinc-50/30 dark:bg-zinc-850/20" : ""
                        }`}
                      >
                        <td className="py-3 px-6 font-medium">
                          <div className="flex items-center gap-2.5">
                            {doc.type === "LEGAL_ANALYSIS" ? (
                              <span className="inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 text-[10px] font-medium font-sans">
                                <Brain className="h-3 w-3" />
                                Legal Analysis
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 text-[10px] font-medium font-sans">
                                <Gavel className="h-3 w-3" />
                                FIR Document
                              </span>
                            )}
                            <span className="text-zinc-800 dark:text-zinc-200 font-sans">{doc.title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-zinc-400 font-semibold">
                          v{doc.version}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => setSelectedDocId(doc.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all ${
                                isSelected
                                  ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-150 dark:border-zinc-150 dark:text-zinc-900"
                                  : "border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </button>
                            <button
                              disabled
                              title="Download PDF (Coming Soon)"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 bg-zinc-50/50 dark:bg-zinc-950/20 cursor-not-allowed"
                            >
                              <Download className="h-3 w-3" />
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Active Document Viewer Content Section */}
      {!isPending && selectedDoc && (
        <div className="space-y-6">
          {selectedDoc.type === "LEGAL_ANALYSIS" ? (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden animate-fadeIn">
              {/* Header */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Brain className="h-4.5 w-4.5 text-zinc-500" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider">AI Legal Analysis Report</span>
                </div>
                {renderConfidenceBadge(selectedDoc.content.confidence)}
              </div>

              <div className="p-6 md:p-8 space-y-6">
                {/* Summary Card */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                    Incident Abstract
                  </h4>
                  <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 font-sans font-medium">
                    {selectedDoc.content.summary}
                  </p>
                </div>

                {/* Applicable Sections Cards */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                  <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                    Applicable Offenses
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedDoc.content.applicableSections?.map((sec: any, idx: number) => (
                      <div 
                        key={idx}
                        className="rounded-lg border border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/20 p-4 space-y-2.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                      >
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                          <Gavel className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                          <span className="text-xs font-mono font-bold">{sec.section}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {sec.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reasoning Card */}
                <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                  <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                    Detailed Legal Reasoning
                  </h4>
                  <div className="rounded-lg border border-zinc-100 dark:border-zinc-800/40 bg-zinc-50/10 p-5 font-sans text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {selectedDoc.content.reasoning}
                  </div>
                </div>
              </div>
            </div>
        ) : (
          <div className="animate-fadeIn">
            <FIRDocumentViewer 
              fir={selectedDoc.content} 
              version={selectedDoc.version} 
              createdAt={new Date(selectedDoc.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
          </div>
        )}
      </div>
    )}
    </div>
  );
}
