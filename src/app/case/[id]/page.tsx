import { CaseService } from "@/services/case/case.services";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Download, 
  Briefcase
} from "lucide-react";
import CaseAnalysisPanel from "@/components/case/case-analysis-panel";
import CaseMetadataSection from "@/components/case/case-metadata-section";
import CaseTimeline from "@/components/case/case-timeline";
import CasePersonsSection from "@/components/case/case-persons-section";
import CaseEvidenceSection from "@/components/case/case-evidence-section";
import CaseChecklistSection from "@/components/case/case-checklist-section";
import CaseNarrativeCollapse from "@/components/case/case-narrative-collapse";
import CaseOverviewCards from "@/components/case/case-overview-cards";
import CaseAIInsightsDash from "@/components/case/case-ai-insights-dash";
import CaseInvestigationProfileSection from "@/components/case/case-investigation-profile-section";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = new CaseService();

  let caseItem;
  try {
    caseItem = await service.getCaseById(id);
  } catch (error) {
    console.error("Error fetching CaseDetailPage:", error);
    notFound();
  }

  const documents = caseItem.documents || [];


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
  const filledFields = caseItem.metadata
    ? metadataFields.filter(
        (field) =>
          caseItem.metadata?.[field as keyof typeof caseItem.metadata] !== null &&
          caseItem.metadata?.[field as keyof typeof caseItem.metadata] !== undefined &&
          String(caseItem.metadata?.[field as keyof typeof caseItem.metadata]).trim() !== ""
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
  const checklistCompleted = caseItem.checklist?.filter(item => item.completed).length || 0;
  const checklistTotal = caseItem.checklist?.length || 0;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      
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
              <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[9px] font-mono font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">
                REF: {caseItem.id.toUpperCase()}
              </span>
              <span className="rounded bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200/20 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider">
                RESTRICTED
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans leading-tight">
              {caseItem.title}
            </h1>

            <div className="flex flex-wrap gap-4 text-[11px] font-mono text-zinc-450 dark:text-zinc-500">
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
          <div className="flex flex-wrap items-center gap-2">
            <button 
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-zinc-450" />
              <span>Export Briefing</span>
            </button>

            <button 
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Briefcase className="h-3.5 w-3.5 text-zinc-450" />
              <span>Draft Charge Sheet</span>
              <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-[8px] font-mono text-zinc-400 uppercase">AI Tool</span>
            </button>
          </div>

        </div>

        {/* Expandable statement narrative */}
        <CaseNarrativeCollapse narrative={caseItem.narrative} />
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
        caseData={JSON.parse(JSON.stringify(caseItem))} 
      />

      {/* 5. Metadata Profile Section */}
      <CaseMetadataSection 
        caseId={caseItem.id} 
        metadata={caseItem.metadata ? JSON.parse(JSON.stringify(caseItem.metadata)) : null} 
      />

      {/* 5. Persons/Parties Profile Section */}
      <CasePersonsSection 
        caseId={caseItem.id} 
        initialPersons={caseItem.persons ? JSON.parse(JSON.stringify(caseItem.persons)) : []} 
      />

      {/* 6. Evidence List Profile Section */}
      <CaseEvidenceSection 
        caseId={caseItem.id} 
        initialEvidence={caseItem.evidence ? JSON.parse(JSON.stringify(caseItem.evidence)) : []} 
      />

      {/* 7. Checklist / Procedures Section */}
      <CaseChecklistSection 
        caseId={caseItem.id} 
        initialChecklist={caseItem.checklist ? JSON.parse(JSON.stringify(caseItem.checklist)) : []} 
      />

      {/* 8. AI Generated Documents / Analysis Section */}
      <CaseAnalysisPanel 
        caseId={caseItem.id} 
        initialDocuments={JSON.parse(JSON.stringify(documents))} 
        aiRequests={JSON.parse(JSON.stringify(caseItem.aiRequests || []))}
        caseTitle={caseItem.title}
        caseNumber={caseItem.investigationProfile?.firNumber || caseItem.id}
      />

      {/* 9. Chronological Activity Timeline */}
      <CaseTimeline 
        activities={caseItem.activities ? JSON.parse(JSON.stringify(caseItem.activities)) : []} 
      />

    </div>
  );
}
