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
    let auditModule: AuditModule = "SYSTEM";
    let isAi = false;

    switch (type) {
      case "CASE_CREATED":
        severity = "SUCCESS";
        auditModule = "CASE";
        break;
      case "CASE_UPDATED":
        severity = "INFO";
        auditModule = "CASE";
        break;
      case "METADATA_CREATED":
      case "METADATA_UPDATED":
        severity = "INFO";
        auditModule = "CASE";
        break;
      
      case "LEGAL_ANALYSIS_GENERATED":
      case "FIR_GENERATED":
      case "INVESTIGATION_SUMMARY_GENERATED":
      case "CHARGE_SHEET_GENERATED":
      case "REMAND_REQUEST_GENERATED":
      case "CASE_DIARY_GENERATED":
      case "DOCUMENT_REGENERATED":
        severity = "SUCCESS";
        auditModule = "DOCUMENT";
        isAi = true;
        break;

      case "DOCUMENT_DOWNLOADED":
        severity = "INFO";
        auditModule = "DOCUMENT";
        break;

      case "AI_DIAGNOSTICS_GENERATED":
        severity = "SUCCESS";
        auditModule = "DIAGNOSTICS";
        isAi = true;
        break;

      case "DOCUMENT_CREATED":
        severity = "SUCCESS";
        auditModule = "DOCUMENT";
        break;

      case "PERSON_ADDED":
      case "PERSON_UPDATED":
      case "VICTIM_ADDED":
      case "VICTIM_UPDATED":
        severity = "INFO";
        auditModule = "PERSON";
        break;
      case "PERSON_DELETED":
        severity = "WARNING";
        auditModule = "PERSON";
        break;

      case "EVIDENCE_ADDED":
      case "EVIDENCE_UPDATED":
        severity = "INFO";
        auditModule = "EVIDENCE";
        break;
      case "EVIDENCE_DELETED":
        severity = "WARNING";
        auditModule = "EVIDENCE";
        break;

      case "CHECKLIST_ITEM_COMPLETED":
        severity = "SUCCESS";
        auditModule = "CHECKLIST";
        break;

      case "INVESTIGATION_PROFILE_UPDATED":
        severity = "INFO";
        auditModule = "PROFILE";
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
      module: auditModule,
      isAi,
    };
  }

  /**
   * Get filtered, paginated activities.
   */
  async getAuditLogs(userId: string, filters: AuditLogFilters = {}) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";

    // Build the query where clause
    const where: any = {
      case: { userId },
    };

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

    // Calculate overall stats before memory-based filters
    const stats: AuditDashboardStats = {
      totalCount: enriched.length,
      isAi: 0, // Backward compatibility or client layout checks
      aiCount: enriched.filter((e) => e.isAi).length,
      severeCount: enriched.filter((e) => e.severity === "WARNING" || e.severity === "HIGH").length,
      userCount: enriched.filter((e) => !e.isAi).length,
    } as any;

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
  async getCasesForFilter(userId: string) {
    return prisma.case.findMany({
      where: { userId },
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
