import { caseClient, jobClient } from "@/lib/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Lock
} from "lucide-react";
import CaseAnalysisPanel, { type AIRequestLog } from "@/features/case/components/case-analysis-panel";
import CaseMetadataSection from "@/features/case/components/case-metadata-section";
import CaseTimeline from "@/features/case/components/case-timeline";
import CasePersonsSection from "@/features/case/components/case-persons-section";
import CaseEvidenceSection from "@/features/case/components/case-evidence-section";
import CaseChecklistSection from "@/features/case/components/case-checklist-section";
import CaseNarrativeCollapse from "@/features/case/components/case-narrative-collapse";
import CaseOverviewCards from "@/features/case/components/case-overview-cards";
import CaseAIInsightsDash from "@/features/case/components/case-ai-insights-dash";
import CaseInvestigationProfileSection from "@/features/case/components/case-investigation-profile-section";
import CaseHeaderActions from "@/features/case/components/case-header-actions";

import { requireUser } from "@/lib/auth/session";
import { toClient } from "@/lib/utils";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;

  let caseItem: any = null;
  let fetchError: any = null;

  try {
    caseItem = await caseClient.get(id);
  } catch (error: any) {
    console.error(`[CaseDetailPage] Error loading case "${id}":`, error);
    fetchError = error;
  }

  // Gracefully handle 401 without redirect loops back to login/case
  if (fetchError?.status === 401) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="max-w-md w-full space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 shadow-sm">
            <Lock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded">
              Authentication Session Expired
            </span>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Session Requires Re-authentication
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Your security session with the investigation backend has expired or is invalid. Please sign in again to access this dossier.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <a
              href="/api/auth/google"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white px-4 py-2.5 text-xs font-semibold shadow-sm transition-all"
            >
              Sign In with Google
            </a>
            <Link
              href="/case"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2.5 text-xs font-semibold shadow-sm transition-all"
            >
              Back to Cases
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not found (404) or missing case record
  if (fetchError?.status === 404 || (!fetchError && !caseItem)) {
    notFound();
  }

  // Re-throw unexpected 5xx / network errors to the error.tsx boundary
  if (fetchError) {
    throw fetchError;
  }

  const documents = caseItem.generatedDocuments || [];

  // Minimal case data for client-side pre-flight validation of document generation
  const preflightData = {
    accused: (caseItem.accused || []).map((a: any) => ({ arrestStatus: a?.arrestStatus ?? null })),
    persons: (caseItem.persons || []).map((p: any) => ({ role: p?.role })),
    victims: caseItem.victims || [],
  };

  let activeJobs: any[] = [];
  let failedJobs: any[] = [];
  try {
    const jobsData = await jobClient.getCaseJobs(id);
    activeJobs = jobsData?.activeJobs || [];
    failedJobs = jobsData?.failedJobs || [];
  } catch (error) {
    console.error(`[CaseDetailPage] Could not load background jobs for case "${id}":`, error);
  }

  // Calculate metadata completeness percentage
  const metadataFields = [
    "incidentDate",
    "incidentTime",
    "incidentLocation",
    "victimName",
    "victimStatement",
    "suspectName",
    "suspectDescription",
    "witnessInformation",
    "evidenceSummary",
    "officerNotes",
  ];
  const filledFields = caseItem.caseMetadata
    ? metadataFields.filter(
        (field) =>
          caseItem.caseMetadata?.[field as keyof typeof caseItem.caseMetadata] !== null &&
          caseItem.caseMetadata?.[field as keyof typeof caseItem.caseMetadata] !== undefined &&
          String(caseItem.caseMetadata?.[field as keyof typeof caseItem.caseMetadata]).trim() !== ""
      ).length
    : 0;
  const completenessPercent = Math.round((filledFields / metadataFields.length) * 100);

  // Format timestamps
  const dateCreated = caseItem.createdAt
    ? new Date(caseItem.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not Recorded";

  const dateUpdated = caseItem.updatedAt
    ? new Date(caseItem.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not Recorded";

  const totalPersons = caseItem.persons?.length || 0;
  const totalEvidence = caseItem.evidence?.length || 0;
  const checklistCompleted = caseItem.checklistItems?.filter((item: any) => item.completed).length || 0;
  const checklistTotal = caseItem.checklistItems?.length || 0;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 font-sans">
      
      {/* Breadcrumb Navigation & Security Classification Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <Link
          href="/case"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Case Directory
        </Link>

        <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-1 rounded">
          Classified: Law Enforcement Sensitive
        </div>
      </div>

      {/* 1. Case Header */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          
          {/* Title & MONO References */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[9px] font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                REF: {caseItem.id.toUpperCase()}
              </span>
              <span className="rounded bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200/20 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider">
                RESTRICTED
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans leading-tight">
              {caseItem.title}
            </h1>

            <div className="flex flex-wrap gap-4 text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Filed: {dateCreated}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Updated: {dateUpdated}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Action Bar */}
          <CaseHeaderActions
            caseId={caseItem.id}
            caseTitle={caseItem.title}
            caseNarrative={caseItem.narrative || ""}
            caseStatus={caseItem.status}
          />

        </div>

        {/* Expandable statement narrative */}
        <CaseNarrativeCollapse narrative={caseItem.narrative || "No case narrative recorded."} />
      </div>

      {/* 2. Overview Cards */}
      <CaseOverviewCards
        status={caseItem.status}
        completenessPercent={completenessPercent}
        totalPersons={totalPersons}
        totalEvidence={totalEvidence}
        checklistCompleted={checklistCompleted}
        checklistTotal={checklistTotal}
      />

      {/* 3. AI Insights Dashboard */}
      <CaseAIInsightsDash 
        caseId={caseItem.id} 
      />

      {/* 4. Unified Case Investigation Profile (Single Source of Truth) */}
      <CaseInvestigationProfileSection 
        caseId={caseItem.id} 
        caseData={toClient(caseItem)} 
      />

      {/* 5. Metadata Profile Section */}
      <CaseMetadataSection 
        caseId={caseItem.id} 
        metadata={caseItem.caseMetadata ? toClient(caseItem.caseMetadata) : null} 
      />

      {/* 5. Persons/Parties Profile Section */}
      <CasePersonsSection 
        caseId={caseItem.id} 
        initialPersons={toClient(caseItem.persons || [])} 
      />

      {/* 6. Evidence List Profile Section */}
      <CaseEvidenceSection 
        caseId={caseItem.id} 
        initialEvidence={toClient(caseItem.evidence || [])} 
      />

      {/* 7. Checklist / Procedures Section */}
      <CaseChecklistSection 
        caseId={caseItem.id} 
        initialChecklist={toClient(caseItem.checklistItems || [])} 
      />

      {/* 8. AI Generated Documents / Analysis Section */}
      <CaseAnalysisPanel 
        caseId={caseItem.id} 
        initialDocuments={toClient(documents)} 
        aiRequests={toClient(caseItem.aiRequestLogs || []) as AIRequestLog[]}
        caseTitle={caseItem.title}
        caseNumber={caseItem.investigationProfile?.firNumber || caseItem.id}
        initialActiveJobs={toClient(activeJobs)}
        initialFailedJobs={toClient(failedJobs)}
        preflightData={toClient(preflightData)}
      />

      {/* 9. Chronological Activity Timeline */}
      <CaseTimeline 
        caseId={caseItem.id}
        activities={toClient(caseItem.activities || [])} 
      />

    </div>
  );
}
