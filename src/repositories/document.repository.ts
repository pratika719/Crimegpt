import { prisma } from "@/lib/prisma";
import { DocumentType } from "@/generated/prisma/client";

export class DocumentRepository {
  private async checkCaseOwnership(caseId: string, userId: string, tx?: any) {
    const client = tx || prisma;
    const c = await client.case.findFirst({
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
  }, tx?: any) {
    await this.checkCaseOwnership(data.caseId, userId, tx);
    const client = tx || prisma;
    return client.generatedDocument.create({
      data,
    });
  }

  /**
   * Creates a GENERATING placeholder document that will be updated by the worker on completion.
   */
  async createGenerating(userId: string, data: {
    caseId: string;
    type: DocumentType;
    title: string;
    sourceSnapshot?: any;
  }, tx?: any) {
    await this.checkCaseOwnership(data.caseId, userId, tx);
    const client = tx || prisma;
    return client.generatedDocument.create({
      data: {
        caseId: data.caseId,
        type: data.type,
        title: data.title,
        content: {},
        status: "GENERATING",
        sourceSnapshot: data.sourceSnapshot,
        generatedBy: userId,
      },
    });
  }

  /**
   * Transitions a GENERATING document to COMPLETED with real content.
   */
  async updateToCompleted(id: string, data: {
    title: string;
    content: any;
    version: number;
  }, tx?: any) {
    const client = tx || prisma;
    return client.generatedDocument.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        version: data.version,
        status: "COMPLETED",
        generatedAt: new Date(),
      },
    });
  }

  /**
   * Transitions a GENERATING document to FAILED with an error message.
   */
  async updateToFailed(id: string, errorMessage: string, tx?: any) {
    const client = tx || prisma;
    return client.generatedDocument.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });
  }

  /**
   * Finds a GENERATING document for a given case and type by looking at the sourceSnapshot jobId.
   */
  async findGeneratingByJobId(caseId: string, type: DocumentType, jobId: string) {
    const docs = await prisma.generatedDocument.findMany({
      where: {
        caseId,
        type,
        status: "GENERATING",
      },
      orderBy: { createdAt: "desc" },
    });

    // Match by jobId stored in sourceSnapshot
    return docs.find((d) => {
      const snapshot = d.sourceSnapshot as { jobId?: string } | null;
      return snapshot?.jobId === jobId;
    }) ?? null;
  }

  /**
   * Fetches the latest generated document of a specific type for a case.
   */
  async findLatestByType(caseId: string, userId: string, type: DocumentType, tx?: any) {
    await this.checkCaseOwnership(caseId, userId, tx);
    const client = tx || prisma;
    return client.generatedDocument.findFirst({
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

  /**
   * Finds a single document by ID with ownership verification.
   */
  async findById(id: string, userId: string, caseId?: string) {
    return prisma.generatedDocument.findFirst({
      where: {
        id,
        ...(caseId ? { caseId } : {}),
        case: { userId },
      },
    });
  }

  /**
   * Updates the title of a generated document.
   */
  async updateTitle(id: string, userId: string, title: string, caseId?: string) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new Error("Unauthorized: Document not found or access denied.");
    }

    return prisma.generatedDocument.update({
      where: { id },
      data: { title },
    });
  }

  /**
   * Deletes a single generated document by ID.
   */
  async deleteById(id: string, userId: string, caseId?: string) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new Error("Unauthorized: Document not found or access denied.");
    }

    return prisma.generatedDocument.delete({
      where: { id },
    });
  }
}

export const documentRepository = new DocumentRepository();
export default documentRepository;
