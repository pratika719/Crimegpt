"use server";

import { searchService } from "@/services/search/search.service";
import { SearchResultDTO } from "@/types/search.types";

/**
 * Server action to run global keyword search across all platforms elements.
 */
export async function performGlobalSearchAction(query: string) {
  try {
    if (!query || query.trim() === "") {
      return {
        success: true,
        results: [] as SearchResultDTO[],
      };
    }

    const results = await searchService.search(query);
    return {
      success: true,
      results,
    };
  } catch (error: any) {
    console.error("❌ Action Failure (performGlobalSearchAction):", error);
    return {
      success: false,
      message: error?.message || "Search execution failed. Please try again.",
      results: [] as SearchResultDTO[],
    };
  }
}
