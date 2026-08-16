import { ZodError } from "zod";

/**
 * Error taxonomy for AI document generation failures.
 *
 * Carries machine-readable metadata so the worker can persist structured
 * failure details (errorCode / failureType) and the frontend can render
 * user-friendly, actionable errors instead of raw JSON/Zod dumps.
 */

export type DocumentErrorCode =
  | "VALIDATION_FAILED"
  | "CASE_DATA_MISSING"
  | "AI_PROVIDER_OVERLOADED"
  | "AI_TIMEOUT"
  | "INTERNAL";

export type DocumentFailureType = "validation" | "data" | "transient" | "internal";

export type DocumentGenerationErrorOptions = {
  code: DocumentErrorCode;
  failureType: DocumentFailureType;
  userMessage: string;
  details?: unknown;
  cause?: unknown;
};

export class DocumentGenerationError extends Error {
  readonly retryable = false;
  readonly code: DocumentErrorCode;
  readonly failureType: DocumentFailureType;
  readonly userMessage: string;
  readonly details?: unknown;

  constructor(message: string, options: DocumentGenerationErrorOptions) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "DocumentGenerationError";
    this.code = options.code;
    this.failureType = options.failureType;
    this.userMessage = options.userMessage;
    this.details = options.details;
  }
}

export function isDocumentGenerationError(
  error: unknown,
): error is DocumentGenerationError {
  return error instanceof DocumentGenerationError;
}

export type DocumentErrorMeta = {
  code?: string;
  failureType?: string;
  message: string;
  userMessage: string;
};

/**
 * Extracts machine-readable failure metadata from any thrown error.
 * Falls back to a plain message for unknown errors.
 */
export function getDocumentErrorMeta(error: unknown): DocumentErrorMeta {
  if (error instanceof DocumentGenerationError) {
    return {
      code: error.code,
      failureType: error.failureType,
      message: error.message,
      userMessage: error.userMessage,
    };
  }
  const message =
    error instanceof Error ? error.message : "Unknown AI generation error.";
  return { message, userMessage: message };
}

export function documentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    REMAND_REQUEST: "Remand Request",
    FIR: "First Information Report (FIR)",
    CHARGE_SHEET: "Charge Sheet",
    INVESTIGATION_SUMMARY: "Investigation Summary",
    CASE_DIARY: "Case Diary",
    LEGAL_ANALYSIS: "Legal Analysis",
    AI_DIAGNOSTICS: "AI Diagnostics Report",
  };
  return labels[type] ?? "document";
}

/** Field-level friendly hints keyed on the first segment of the Zod issue path. */
const FIELD_HINTS: Record<string, string> = {
  // Remand Request
  accusedDetails:
    "The AI could not identify any accused person who is currently arrested. Add an accused person with their arrest details, then regenerate.",
  groundsForRemand:
    "The AI did not provide any grounds for remand. Ensure the case has enough investigation detail, then regenerate.",
  custodyRequested: "The AI did not specify a valid custody type and duration.",
  investigationProgress:
    "The AI did not include investigation progress details. Add more case detail, then regenerate.",
  // Charge Sheet
  accusedList:
    "The AI could not list any accused persons. Add accused persons to the case, then regenerate.",
  briefFacts:
    "The AI did not include a sufficiently detailed account of the facts of the case.",
  evidenceCollected:
    "The AI did not include evidence details. Add evidence to the case, then regenerate.",
  witnessStatements:
    "The AI did not include witness statements. Add witnesses to the case, then regenerate.",
  finalConclusion: "The AI did not include a final conclusion for the document.",
  // FIR
  complaintSummary: "The AI did not include a complaint summary.",
  incidentDate: "The AI did not include the incident date/time.",
  incidentLocation: "The AI did not include the incident location.",
  suspectedOffenses: "The AI did not list any suspected offenses.",
  applicableSections:
    "The AI did not include any applicable legal sections. Review the narrative and regenerate.",
  factsOfCase: "The AI did not include the facts of the case.",
  investigationDirections:
    "The AI did not include initial investigation directions.",
  // Investigation Summary
  executiveSummary: "The AI did not include an executive summary.",
  incidentOverview: "The AI did not include an incident overview.",
  factsEstablished: "The AI did not include the established facts.",
  evidenceAssessment: "The AI did not include an evidence assessment.",
  personsInvolved: "The AI did not include the persons involved.",
  investigationFindings: "The AI did not include investigation findings.",
  potentialGaps: "The AI did not include potential gaps in the investigation.",
  recommendedNextSteps: "The AI did not include recommended next steps.",
  conclusion: "The AI did not include a conclusion.",
  // Case Diary
  diaryDate: "The AI did not include the diary date.",
  narrativeDiary:
    "The AI did not include a sufficiently detailed diary entry.",
  nextSteps: "The AI did not include the next steps.",
  // Shared
  caseDetails:
    "The AI did not include the case registration details (FIR number, police station, investigating officer).",
  officerRemarks: "The AI did not include officer remarks.",
  investigatingOfficer: "The AI did not include the investigating officer's name.",
};

const DEFAULT_FIELD_HINT =
  "The AI output was incomplete for one or more required sections.";

export type FormattedValidationError = {
  message: string;
  userMessage: string;
  details: { issues: unknown[]; fieldIssues: Record<string, string[]> };
  fieldIssues: Record<string, string[]>;
};

/**
 * Converts a Zod validation failure into a human-readable error.
 * - `message`    → short summary stored in job status / logs (no raw JSON)
 * - `userMessage`→ friendly, actionable copy shown in the UI
 * - `details`    → raw issues kept for debugging only
 */
export function formatDocumentValidationError(
  type: string,
  error: ZodError | { issues: unknown[] },
): FormattedValidationError {
  const issues = Array.isArray(error?.issues) ? (error.issues as any[]) : [];
  const fieldIssues: Record<string, string[]> = {};
  const fields: string[] = [];

  for (const issue of issues) {
    const field = String(issue?.path?.[0] ?? "root");
    if (!fieldIssues[field]) fieldIssues[field] = [];
    fieldIssues[field].push(
      typeof issue?.message === "string" ? issue.message : "Invalid value",
    );
    if (!fields.includes(field)) fields.push(field);
  }

  const summary =
    fields.length > 0
      ? fields
          .map((field) => FIELD_HINTS[field] ?? DEFAULT_FIELD_HINT)
          .join(" ")
      : "The AI returned output that does not match the expected document format.";

  const userMessage = `The AI couldn't create the ${documentTypeLabel(
    type,
  )}. ${summary} If the problem continues, review the case details and try again.`;
  const message = `Failed to parse or validate ${type} AI output: ${summary}`;

  return {
    message,
    userMessage,
    details: { issues, fieldIssues },
    fieldIssues,
  };
}

/**
 * Builds a bounded repair prompt that feeds the failed output + schema
 * feedback back to the model so it can correct its JSON.
 */
export function buildRepairPrompt(
  originalPrompt: string,
  previousResponse: string,
  issues: unknown[],
): string {
  const issueList = issues
    .map(
      (issue: any) =>
        `- Field: ${issue?.path?.join(".") ?? "root"} | ${
          issue?.message ?? issue?.code ?? "Invalid value"
        }`,
    )
    .join("\n");

  return `${originalPrompt}

---

PREVIOUS RESPONSE FAILED VALIDATION. Fix ONLY the issues listed below and return the COMPLETE corrected JSON matching the original schema. Do not add any text outside the JSON.

PREVIOUS RESPONSE:
${previousResponse}

VALIDATION ERRORS:
${issueList}
`;
}
