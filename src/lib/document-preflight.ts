/**
 * Client-side pre-flight validation for document generation.
 *
 * Mirrors the backend checks in `document-generator.service.ts` so the UI can
 * warn/disable generation *before* a doomed (and costly) Gemini call is queued.
 * Keep the rules in sync with the server-side checks.
 */

export type PreflightCaseData = {
  accused: Array<{ arrestStatus: string | null }>;
  persons: Array<{ role: string }>;
  victims: Array<unknown>;
};

/** Non-null return means the document type is blocked for this case data. */
export type PreflightIssue = {
  message: string;
};

/** Matches the server-side arrest-status heuristic used for REMAND_REQUEST. */
const ARRESTED_STATUS_RE = /arrest|custody|remand|apprehend|taken into|held|detain/i;

/**
 * Returns a blocking issue (with a user-friendly message) if the case data is
 * insufficient to generate the given document type, otherwise null.
 */
export function getPreflightIssue(
  type: string,
  data?: PreflightCaseData,
): PreflightIssue | null {
  const accused = data?.accused ?? [];
  const persons = data?.persons ?? [];
  const victims = data?.victims ?? [];

  if (type === "REMAND_REQUEST") {
    const hasArrestedAccused = accused.some((a) =>
      ARRESTED_STATUS_RE.test(String(a.arrestStatus ?? "")),
    );
    if (!hasArrestedAccused) {
      return {
        message:
          "A Remand Request requires at least one accused person who has been arrested (arrest status like 'Arrested' or 'In Custody'). Add the accused person with their arrest details first.",
      };
    }
  }

  if (type === "CHARGE_SHEET") {
    const hasAccused =
      persons.some((p) => p.role === "SUSPECT") || accused.length > 0;
    if (!hasAccused) {
      return {
        message:
          "A Charge Sheet requires at least one identified accused person (role Suspect/Accused). Add one to the case first.",
      };
    }
  }

  if (type === "FIR") {
    const hasVictim =
      persons.some((p) => p.role === "VICTIM") || victims.length > 0;
    if (!hasVictim) {
      return {
        message:
          "An FIR requires an identified victim or complainant (role Victim). Add one to the case first.",
      };
    }
  }

  return null;
}
