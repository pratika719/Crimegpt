"use server";

import { z } from "zod";
import { searchService } from "@/features/search/services/search.service";
import { SearchResultDTO } from "@/features/search/schemas/search.types";
import { requireUser } from "@/lib/validation/action-guard";
import { actionSuccess, actionFailure } from "@/lib/action-response";
import { logger } from "@/lib/logger";

const SearchQuerySchema = z.string().min(1, "Search query is required");

/**
 * Server action to run global keyword search across all platforms elements.
 */
export async function performGlobalSearchAction(query: string) {
  try {
    const userId = await requireUser();

    if (!query || query.trim() === "") {
      return actionSuccess({ results: [] as SearchResultDTO[] });
    }

    const results = await searchService.search(userId, query);
    return actionSuccess({ results });
  } catch (error: any) {
    logger.error({ err: error }, "Action Failure (performGlobalSearchAction)");
    return actionFailure("INTERNAL_ERROR", error?.message || "Search execution failed. Please try again.");
  }
}
