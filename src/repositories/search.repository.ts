import { prisma } from "@/lib/prisma";

export interface SearchRawResult {
  cases: any[];
  documents: any[];
  evidence: any[];
  persons: any[];
  activities: any[];
  profiles: any[];
}

export class SearchRepository {
  /**
   * Executes database-level search matches across Cases, Documents, Evidence,
   * Persons, Activities, and Investigation Profiles in parallel, scoped by userId.
   */
  async searchAll(userId: string, query: string): Promise<SearchRawResult> {
    const likeQuery = `%${query}%`;

    const [cases, evidence, persons, activities, profiles, rawDocs] = await Promise.all([
      // 1. Cases
      prisma.case.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { narrative: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
      }),

      // 2. Evidence
      prisma.evidence.findMany({
        where: {
          case: { userId },
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
          ],
        },
        include: { case: true },
        take: 10,
      }),

      // 3. Persons
      prisma.person.findMany({
        where: {
          case: { userId },
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { statement: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
          ],
        },
        include: { case: true },
        take: 10,
      }),

      // 4. Activities
      prisma.caseActivity.findMany({
        where: {
          case: { userId },
          description: { contains: query, mode: "insensitive" },
        },
        include: { case: true },
        take: 15,
      }),

      // 5. Investigation Profiles
      prisma.investigationProfile.findMany({
        where: {
          case: { userId },
          OR: [
            { firNumber: { contains: query, mode: "insensitive" } },
            { policeStation: { contains: query, mode: "insensitive" } },
            { investigatingOfficer: { contains: query, mode: "insensitive" } },
            { incidentLocation: { contains: query, mode: "insensitive" } },
            { incidentDescription: { contains: query, mode: "insensitive" } },
            { investigationNotes: { contains: query, mode: "insensitive" } },
          ],
        },
        include: { case: true },
        take: 10,
      }),

      // 6. Generated Documents
      prisma.$queryRaw<any[]>`
        SELECT gd.id, gd.type, gd.title, gd.version, gd."caseId", gd."createdAt", c.title as "caseTitle"
        FROM "GeneratedDocument" gd
        JOIN "Case" c ON gd."caseId" = c.id
        WHERE c."userId" = ${userId}
          AND (gd.title ILIKE ${likeQuery} OR gd.content::text ILIKE ${likeQuery})
        LIMIT 10
      `,
    ]);

    return {
      cases,
      documents: rawDocs,
      evidence,
      persons,
      activities,
      profiles,
    };
  }
}

export const searchRepository = new SearchRepository();
export default searchRepository;
