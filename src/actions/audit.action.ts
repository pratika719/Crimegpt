"use server";

import { auditService, AuditLogFilters } from "@/services/activity/audit.service";

/**
 * Server action to retrieve enriched case activities based on dashboard filters.
 */
export async function getAuditLogsAction(filters: AuditLogFilters) {
  try {
    const data = await auditService.getAuditLogs(filters);
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error("❌ Action Failure (getAuditLogsAction):", error);
    return {
      success: false,
      message: error?.message || "Failed to load audit logs. Please try again.",
      data: {
        activities: [],
        stats: { totalCount: 0, aiCount: 0, severeCount: 0, userCount: 0 },
        pagination: { total: 0, totalPages: 0, currentPage: 1, limit: 20 },
      },
    };
  }
}

/**
 * Server action to fetch case list for the dropdown filter.
 */
export async function getCasesForFilterAction() {
  try {
    const cases = await auditService.getCasesForFilter();
    return {
      success: true,
      cases,
    };
  } catch (error: any) {
    console.error("❌ Action Failure (getCasesForFilterAction):", error);
    return {
      success: false,
      cases: [],
    };
  }
}
