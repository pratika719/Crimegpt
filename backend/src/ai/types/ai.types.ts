/**
 * Shared types for the AI/RAG pipeline.
 *
 * These types are consumed by retrievers, chains, prompts, and domain services.
 * Keeping them in one file avoids circular imports.
 */

// ---------------------------------------------------------------------------
// Law Retrieval
// ---------------------------------------------------------------------------

export interface CleanedLawReference {
  section: string;
  title: string;
  content: string;
  source: string;
  offense: string;
  punishment: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Chain Outputs
// ---------------------------------------------------------------------------

export interface LegalAnalysisResult {
  summary: string;
  applicableSections: Array<{ section: string; reason: string }>;
  reasoning: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ChainOutput {
  result: LegalAnalysisResult;
  modelUsed: string;
  latencyMs: number;
  promptText: string;
  rawResponse: string;
  retrievedChunks: CleanedLawReference[];
}

export interface RiskLevelAssessment {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

export interface MissingInformation {
  items: string[];
  reasoning: string;
}

export interface NextStep {
  task: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export interface SuggestedNextSteps {
  steps: NextStep[];
  reasoning: string;
}

export interface LegalSection {
  section: string;
  offense: string;
  applicability: string;
}

export interface ApplicableLegalSections {
  sections: LegalSection[];
  reasoning: string;
}

export interface EvidenceCompleteness {
  score: number;
  assessment: string;
  gaps: string[];
  reasoning: string;
}

export interface AIDiagnosticsResult {
  riskLevel: RiskLevelAssessment;
  missingInformation: MissingInformation;
  suggestedNextSteps: SuggestedNextSteps;
  applicableLegalSections: ApplicableLegalSections;
  evidenceCompleteness: EvidenceCompleteness;
}

export interface DiagnosticsChainOutput {
  result: AIDiagnosticsResult;
  modelUsed: string;
  latencyMs: number;
  promptText: string;
  rawResponse: string;
  retrievedChunks: CleanedLawReference[];
}
