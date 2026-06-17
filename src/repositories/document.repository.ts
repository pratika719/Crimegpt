import { prisma } from "@/lib/prisma";
import { DocumentType } from "@/generated/prisma/client";

export class DocumentRepository {
  /**
   * Persists a generated document in the database.
   */
  async create(data: {
    caseId: string;
    type: DocumentType;
    title: string;
    content: any; // Stored as Json in Prisma
    version?: number;
  }) {
    return prisma.generatedDocument.create({
      data,
    });
  }

  /**
   * Fetches the latest generated document of a specific type for a case.
   */
  async findLatestByType(caseId: string, type: DocumentType) {
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
  async deleteManyByType(caseId: string, type: DocumentType) {
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
