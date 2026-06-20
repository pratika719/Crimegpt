import { prisma } from "@/lib/prisma";
import { DocumentType } from "@/generated/prisma/client";

export class DocumentRepository {
  private async checkCaseOwnership(caseId: string, userId: string) {
    const c = await prisma.case.findFirst({
      where: { id: caseId, userId },
    });
    if (!c) {
      throw new Error("Unauthorized: Case not found or access denied.");
    }
  }

  /**
   * Persists a generated document in the database.
   */
  async create(userId: string, data: {
    caseId: string;
    type: DocumentType;
    title: string;
    content: any; // Stored as Json in Prisma
    version?: number;
  }) {
    await this.checkCaseOwnership(data.caseId, userId);
    return prisma.generatedDocument.create({
      data,
    });
  }

  /**
   * Fetches the latest generated document of a specific type for a case.
   */
  async findLatestByType(caseId: string, userId: string, type: DocumentType) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.generatedDocument.findFirst({
      where: {
        caseId,
        type,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Deletes all documents of a specific type for a case (useful for regeneration).
   */
  async deleteManyByType(caseId: string, userId: string, type: DocumentType) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.generatedDocument.deleteMany({
      where: {
        caseId,
        type,
      },
    });
  }
}

export const documentRepository = new DocumentRepository();
export default documentRepository;
