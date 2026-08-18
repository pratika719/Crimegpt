import { documentRepository } from "@/features/case/repositories/document.repository";
import { activityService } from "@/features/case/services/activity.service";
import { logger } from "@/lib/logger";

/**
 * Document CRUD service — handles rename and delete operations on already-generated documents.
 * Separate from document-generator.service.ts which handles AI generation.
 */
export class DocumentService {
  private repository = documentRepository;

  /**
   * Renames a generated document. Logs DOCUMENT_RENAMED activity.
   */
  async renameDocument(id: string, userId: string, title: string, caseId?: string) {
    if (!title || !title.trim()) {
      throw new Error("Document title is required.");
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 200) {
      throw new Error("Document title cannot exceed 200 characters.");
    }

    const existing = await this.repository.findById(id, userId, caseId);
    if (!existing) {
      throw new Error("Document not found or access denied.");
    }

    const oldTitle = existing.title;
    logger.info({ id, userId, oldTitle, newTitle: trimmedTitle }, "[DocumentService] Renaming document");

    const result = await this.repository.updateTitle(id, userId, trimmedTitle, caseId);

    // Log activity
    await activityService.logDocumentRenamed(existing.caseId, userId, oldTitle, trimmedTitle);

    return result;
  }

  /**
   * Deletes a single generated document. Logs DOCUMENT_DELETED_SINGLE activity.
   * Does not affect investigation data or trigger AI regeneration.
   */
  async deleteDocument(id: string, userId: string, caseId?: string) {
    const existing = await this.repository.findById(id, userId, caseId);
    if (!existing) {
      throw new Error("Document not found or access denied.");
    }

    logger.info({ id, userId, title: existing.title }, "[DocumentService] Deleting document");

    // Log activity BEFORE deletion (so we have the caseId)
    await activityService.logDocumentDeletedSingle(existing.caseId, userId, existing.title, existing.type);

    const result = await this.repository.deleteById(id, userId, caseId);

    return result;
  }
}

export const documentService = new DocumentService();
export default documentService;
