import { searchRepository } from "@/repositories/search.repository";
import { SearchResultDTO } from "@/types/search.types";

export class SearchService {
  /**
   * Performs global query across cases, documents, evidence, persons, activities, and profiles
   * and maps them into standardized SearchResultDTO records, scoped by userId.
   */
  async search(userId: string, query: string): Promise<SearchResultDTO[]> {
    if (!query || query.trim() === "") {
      return [];
    }

    const trimmed = query.trim();
    const raw = await searchRepository.searchAll(userId, trimmed);
    const results: SearchResultDTO[] = [];

    // 1. Map Cases
    raw.cases.forEach((c) => {
      results.push({
        id: `case-${c.id}`,
        type: "CASE",
        title: c.title,
        subtitle: `Case Dossier • Status: ${c.status}`,
        description: c.narrative.length > 120 ? `${c.narrative.substring(0, 120)}...` : c.narrative,
        url: `/case/${c.id}`,
        badge: c.status,
        createdAt: c.createdAt.toISOString(),
      });
    });

    // 2. Map Documents
    raw.documents.forEach((d) => {
      results.push({
        id: `doc-${d.id}`,
        type: "DOCUMENT",
        title: d.title,
        subtitle: `Generated Document • Case: "${d.caseTitle}"`,
        description: `Version v${d.version} • Type: ${d.type.replace(/_/g, " ")}`,
        url: `/case/${d.caseId}`,
        badge: d.type,
        createdAt: d.createdAt.toISOString(),
      });
    });

    // 3. Map Evidence
    raw.evidence.forEach((e) => {
      results.push({
        id: `ev-${e.id}`,
        type: "EVIDENCE",
        title: e.title,
        subtitle: `Evidence Asset • Case: "${e.case.title}"`,
        description: `Type: ${e.type} • Details: ${e.description || "N/A"}`,
        url: `/case/${e.caseId}`,
        badge: e.type,
        createdAt: e.createdAt.toISOString(),
      });
    });

    // 4. Map Persons
    raw.persons.forEach((p) => {
      results.push({
        id: `person-${p.id}`,
        type: "PERSON",
        title: p.name,
        subtitle: `Person Profile • Case: "${p.case.title}"`,
        description: `Role: ${p.role} • Address: ${p.address || "N/A"} • statement: ${p.statement ? `${p.statement.substring(0, 60)}...` : "No statement recorded."}`,
        url: `/case/${p.caseId}`,
        badge: p.role,
        createdAt: p.createdAt.toISOString(),
      });
    });

    // 5. Map Activities
    raw.activities.forEach((a) => {
      results.push({
        id: `act-${a.id}`,
        type: "ACTIVITY",
        title: a.description,
        subtitle: `Activity Event • Case: "${a.case.title}"`,
        description: `Activity Type: ${a.activityType.replace(/_/g, " ")} • Timestamp: ${new Date(a.createdAt).toLocaleString()}`,
        url: `/case/${a.caseId}`,
        badge: "Timeline",
        createdAt: a.createdAt.toISOString(),
      });
    });

    // 6. Map Investigation Profiles
    raw.profiles.forEach((p) => {
      results.push({
        id: `prof-${p.id}`,
        type: "PROFILE",
        title: `Investigation Profile (FIR: ${p.firNumber || "PENDING"})`,
        subtitle: `Case Dossier Reference: "${p.case.title}"`,
        description: `Station: ${p.policeStation || "N/A"} • Officer: ${p.investigatingOfficer || "N/A"} • Location: ${p.incidentLocation || "N/A"}`,
        url: `/case/${p.caseId}`,
        badge: "Profile",
        createdAt: p.createdAt.toISOString(),
      });
    });

    // Sort results by matches or just return them
    return results;
  }
}

export const searchService = new SearchService();
export default searchService;
