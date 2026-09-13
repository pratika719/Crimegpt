import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DocumentRepository } from '../repositories/document.repository';
import { ActivityService } from './activity.service';

@Injectable()
export class DocumentCrudService {
  private readonly logger = new Logger(DocumentCrudService.name);

  constructor(
    private readonly repository: DocumentRepository,
    private readonly activityService: ActivityService,
  ) {}

  async getDocuments(caseId: string, userId: string) {
    return this.repository.findAllByCaseId(caseId, userId);
  }

  async renameDocument(id: string, userId: string, title: string, caseId?: string) {
    const existing = await this.repository.findById(id, userId, caseId);
    if (!existing) {
      throw new NotFoundException('Document not found or access denied');
    }

    const oldTitle = existing.title;
    this.logger.log({ id, userId, oldTitle, newTitle: title }, 'Renaming document');

    const result = await this.repository.updateTitle(id, userId, title, caseId);
    await this.activityService.logDocumentRenamed(existing.caseId, userId, oldTitle, title);

    return result;
  }

  async deleteDocument(id: string, userId: string, caseId?: string) {
    const existing = await this.repository.findById(id, userId, caseId);
    if (!existing) {
      throw new NotFoundException('Document not found or access denied');
    }

    this.logger.log({ id, userId, title: existing.title }, 'Deleting document');
    await this.activityService.logDocumentDeletedSingle(
      existing.caseId,
      userId,
      existing.title,
      existing.type,
    );

    return this.repository.deleteById(id, userId, caseId);
  }
}
