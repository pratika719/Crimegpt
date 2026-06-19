import { prisma } from "@/lib/prisma";
import { ActivityType } from "@/generated/prisma/client";

export type AuditSeverity = "INFO" | "SUCCESS" | "WARNING" | "HIGH";
export type AuditModule = "CASE" | "DOCUMENT" | "PERSON" | "EVIDENCE" | "CHECKLIST" | "PROFILE" | "DIAGNOSTICS" | "SYSTEM";

export interface EnrichedActivity {
  id: string;
  activityType: ActivityType;
  description: string;
  metadata: any;
  createdAt: Date;
  caseId: string;
  caseTitle: string;
  severity: AuditSeverity;
  module: AuditModule;
  isAi: boolean;
}

export interface AuditLogFilters {
  caseId?: string;
  module?: AuditModule;
  severity?: AuditSeverity;
  isAi?: boolean;
  startDate?: string; // ISO string or YYYY-MM-DD
  endDate?: string;
  search?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface AuditDashboardStats {
  totalCount: number;
  aiCount: number;
  severeCount: number;
  userCount: number;
}

export class AuditService {
  /**
   * Helper to determine enrichment fields based on the ActivityType
   */
  private enrichActivity(activity: any): EnrichedActivity {
    const type = activity.activityType;
    let severity: AuditSeverity = "INFO";
    let module: AuditModule = "SYSTEM";
    let isAi = false;

    switch (type) {
      case "CASE_CREATED":
        severity = "SUCCESS";
        module = "CASE";
        break;
      case "CASE_UPDATED":
        severity = "INFO";
        module = "CASE";
        break;
      case "METADATA_CREATED":
      case "METADATA_UPDATED":
        severity = "INFO";
        module = "CASE";
        break;
      
      case "LEGAL_ANALYSIS_GENERATED":
      case "FIR_GENERATED":
      case "INVESTIGATION_SUMMARY_GENERATED":
      case "CHARGE_SHEET_GENERATED":
      case "REMAND_REQUEST_GENERATED":
      case "CASE_DIARY_GENERATED":
      case "DOCUMENT_REGENERATED":
        severity = "SUCCESS";
        module = "DOCUMENT";
        isAi = true;
        break;

      case "DOCUMENT_DOWNLOADED":
        severity = "INFO";
        module = "DOCUMENT";
        break;

      case "AI_DIAGNOSTICS_GENERATED":
        severity = "SUCCESS";
        module = "DIAGNOSTICS";
        isAi = true;
        break;

      case "DOCUMENT_CREATED":
        severity = "SUCCESS";
        module = "DOCUMENT";
        break;

      case "PERSON_ADDED":
      case "PERSON_UPDATED":
      case "VICTIM_ADDED":
      case "VICTIM_UPDATED":
        severity = "INFO";
        module = "PERSON";
        break;
      case "PERSON_DELETED":
        severity = "WARNING";
        module = "PERSON";
        break;

      case "EVIDENCE_ADDED":
      case "EVIDENCE_UPDATED":
        severity = "INFO";
        module = "EVIDENCE";
        break;
      case "EVIDENCE_DELETED":
        severity = "WARNING";
        module = "EVIDENCE";
        break;

      case "CHECKLIST_ITEM_COMPLETED":
        severity = "SUCCESS";
        module = "CHECKLIST";
        break;

      case "INVESTIGATION_PROFILE_UPDATED":
        severity = "INFO";
        module = "PROFILE";
        break;

      default:
        // Check text matching just in case
        if (type.includes("DELETED")) {
          severity = "WARNING";
        } else if (type.includes("GENERATED") || type.includes("AI")) {
          isAi = true;
          severity = "SUCCESS";
        }
        break;
    }

    return {
      id: activity.id,
      activityType: activity.activityType,
      description: activity.description,
      metadata: activity.metadata,
      createdAt: activity.createdAt,
      caseId: activity.caseId,
      caseTitle: activity.case?.title || "Unknown Case",
      severity,
      module,
      isAi,
    };
  }

  /**
   * Get filtered, paginated activities.
   */
  async getAuditLogs(filters: AuditLogFilters = {}) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";

    // Build the query where clause
    const where: any = {};

    if (filters.caseId && filters.caseId !== "ALL") {
      where.caseId = filters.caseId;
    }

    // Date range filtering
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(`${filters.startDate}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(`${filters.endDate}T23:59:59.999Z`);
      }
    }

    // Text search query filtering
    if (filters.search && filters.search.trim() !== "") {
      const searchTrim = filters.search.trim();
      where.OR = [
        { description: { contains: searchTrim, mode: "insensitive" } },
      ];
    }

    // Fetch all candidates from Prisma to filter/enrich/page them
    // (since isAi, severity, and module are computed client-side/service-side, we filter client-side if these filters are active, or we fetch matching and filter in JS)
    // Wait, since we are doing dynamic enrichment, we load the candidate activities from the DB.
    // If the database has 100k records, loading all of them is bad. But in typical use/demos or moderate databases, it is fast.
    // To make it efficient, if no severity/isAi/module filter is applied, we can use DB pagination directly.
    // Let's implement an intelligent approach: load all matching DB filters (caseId, startDate, endDate, search), enrich them, then apply severity, isAi, and module filters in memory, then paginate.
    // This is clean, robust, and works perfectly without schema changes.
    const rawActivities = await prisma.caseActivity.findMany({
      where,
      include: {
        case: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: sortOrder,
      },
    });

    // Enrich
    let enriched = rawActivities.map((act) => this.enrichActivity(act));

    // Calculate overall stats before specific status/isAi filters
    const stats: AuditDashboardStats = {
      totalCount: enriched.length,
      aiCount: enriched.filter((e) => e.isAi).length,
      severeCount: enriched.filter((e) => e.severity === "WARNING" || e.severity === "HIGH").length,
      userCount: enriched.filter((e) => !e.isAi).length,
    };

    // Apply memory-based filters
    if (filters.module && filters.module !== "ALL" as any) {
      enriched = enriched.filter((e) => e.module === filters.module);
    }
    if (filters.severity && filters.severity !== "ALL" as any) {
      enriched = enriched.filter((e) => e.severity === filters.severity);
    }
    if (filters.isAi !== undefined) {
      const isAiBool = String(filters.isAi) === "true";
      enriched = enriched.filter((e) => e.isAi === isAiBool);
    }

    // Recalculate stats for the filtered list if needed, or keep global candidate stats. Let's return global candidate stats so that the metrics represent the current scope (case/date scope).
    const totalFiltered = enriched.length;
    const totalPages = Math.ceil(totalFiltered / limit);
    const paginated = enriched.slice(skip, skip + limit);

    return {
      activities: paginated,
      stats,
      pagination: {
        total: totalFiltered,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }

  /**
   * Helper to fetch all cases for the filter dropdown
   */
  async getCasesForFilter() {
    return prisma.case.findMany({
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

export const auditService = new AuditService();
export default auditService;
