"use server";

import { z } from "zod";
import { auditService, AuditLogFilters } from "@/features/audit/services/audit.service";
import { requireUser } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";
import { toClient } from "@/lib/utils";
import { logger } from "@/lib/logger";

const GetAuditLogsSchema = z.object({
  caseId: z.string().optional(),
  module: z.string().optional(),
  severity: z.string().optional(),
  isAi: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

/**
 * Server action to retrieve enriched case activities based on dashboard filters.
 */
export async function getAuditLogsAction(filters: AuditLogFilters) {
  try {
    const userId = await requireUser();

    const data = await auditService.getAuditLogs(userId, filters);

    return actionSuccess({
      data: toClient(data),
    });
  } catch (error: any) {
    logger.error({ err: error }, "Action Failure (getAuditLogsAction)");
    return actionFailure("INTERNAL_ERROR", error?.message || "Failed to load audit logs. Please try again.");
  }
}

/**
 * Server action to fetch case list for the dropdown filter.
 */
export async function getCasesForFilterAction() {
  try {
    const userId = await requireUser();

    const cases = await auditService.getCasesForFilter(userId);
    return actionSuccess({ cases });
  } catch (error: any) {
    logger.error({ err: error }, "Action Failure (getCasesForFilterAction)");
    return actionFailure("INTERNAL_ERROR", error?.message || "Failed to load cases.");
  }
}
