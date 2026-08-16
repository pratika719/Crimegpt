import { describe, expect, it } from "vitest";
import { getPreflightIssue, type PreflightCaseData } from "@/lib/document-preflight";

const emptyData: PreflightCaseData = { accused: [], persons: [], victims: [] };

describe("getPreflightIssue", () => {
  it("returns null for document types without pre-flight rules", () => {
    expect(getPreflightIssue("LEGAL_ANALYSIS", emptyData)).toBeNull();
    expect(getPreflightIssue("INVESTIGATION_SUMMARY", emptyData)).toBeNull();
    expect(getPreflightIssue("CASE_DIARY", emptyData)).toBeNull();
  });

  it("blocks (treats missing data as empty) when no preflight data is provided", () => {
    expect(getPreflightIssue("REMAND_REQUEST", undefined)).not.toBeNull();
    expect(getPreflightIssue("FIR", undefined)).not.toBeNull();
  });

  describe("REMAND_REQUEST", () => {
    it("blocks when there is no arrested accused", () => {
      const issue = getPreflightIssue("REMAND_REQUEST", {
        accused: [
          { arrestStatus: "Absconding" },
          { arrestStatus: "Under Investigation" },
          { arrestStatus: null },
        ],
        persons: [],
        victims: [],
      });

      expect(issue).not.toBeNull();
      expect(issue?.message).toContain("arrested");
    });

    it("allows when an accused is arrested or in custody", () => {
      const arrested = getPreflightIssue("REMAND_REQUEST", {
        accused: [{ arrestStatus: "Arrested" }],
        persons: [],
        victims: [],
      });
      expect(arrested).toBeNull();

      const custody = getPreflightIssue("REMAND_REQUEST", {
        accused: [{ arrestStatus: "In Police Custody" }],
        persons: [],
        victims: [],
      });
      expect(custody).toBeNull();
    });
  });

  describe("CHARGE_SHEET", () => {
    it("blocks when there is no accused/suspect", () => {
      expect(getPreflightIssue("CHARGE_SHEET", emptyData)).not.toBeNull();
    });

    it("allows when a SUSPECT person exists", () => {
      const issue = getPreflightIssue("CHARGE_SHEET", {
        accused: [],
        persons: [{ role: "SUSPECT" }],
        victims: [],
      });
      expect(issue).toBeNull();
    });

    it("allows when an accused entry exists", () => {
      const issue = getPreflightIssue("CHARGE_SHEET", {
        accused: [{ arrestStatus: "On Bail" }],
        persons: [],
        victims: [],
      });
      expect(issue).toBeNull();
    });
  });

  describe("FIR", () => {
    it("blocks when there is no victim/complainant", () => {
      expect(getPreflightIssue("FIR", emptyData)).not.toBeNull();
    });

    it("allows when a VICTIM person exists", () => {
      const issue = getPreflightIssue("FIR", {
        accused: [],
        persons: [{ role: "VICTIM" }],
        victims: [],
      });
      expect(issue).toBeNull();
    });

    it("allows when a victim record exists (backend parity)", () => {
      const issue = getPreflightIssue("FIR", {
        accused: [],
        persons: [],
        victims: [{ id: "victim-1" }],
      });
      expect(issue).toBeNull();
    });
  });
});
