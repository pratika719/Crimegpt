import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ChecklistRepository } from '../repositories/checklist.repository';
import { ActivityService } from './activity.service';

@Injectable()
export class ChecklistService {
  private readonly logger = new Logger(ChecklistService.name);

  constructor(
    private readonly repository: ChecklistRepository,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Creates a new checklist item under a case.
   */
  async createChecklistItem(caseId: string, userId: string, title: string) {
    this.logger.log({ caseId, userId, title }, 'Creating checklist item');
    return this.repository.create(caseId, userId, title);
  }

  /**
   * Retrieves a checklist item by ID.
   */
  async getChecklistItemById(id: string, userId: string, caseId?: string) {
    const item = await this.repository.findById(id, userId, caseId);
    if (!item) {
      throw new NotFoundException('Checklist item not found or access denied.');
    }
    return item;
  }

  /**
   * Retrieves all checklist items for a case.
   */
  async getChecklistByCaseId(caseId: string, userId: string) {
    return this.repository.findByCaseId(caseId, userId);
  }

  /**
   * Updates a checklist item.
   * If toggled to completed=true, sets completedAt and logs activity.
   * If toggled to completed=false, nulls completedAt.
   */
  async updateChecklistItem(
    id: string,
    userId: string,
    input: {
      title?: string;
      completed?: boolean;
      completedAt?: Date | null;
    },
    caseId?: string,
  ) {
    const existing = await this.getChecklistItemById(id, userId, caseId);

    // Prepare updated values
    const completed = input.completed;
    let completedAt = input.completedAt;

    if (completed !== undefined) {
      if (completed && !existing.completed) {
        // Transition: false -> true
        completedAt = new Date();
      } else if (!completed && existing.completed) {
        // Transition: true -> false
        completedAt = null;
      } else {
        // No status change
        completedAt = existing.completedAt;
      }
    }

    const updatedData = {
      ...input,
      completed,
      completedAt,
    };

    this.logger.log({ id, userId }, 'Updating checklist item');
    const result = await this.repository.update(id, userId, updatedData, caseId);

    // If transitioned from false to true, log timeline activity
    if (completed && !existing.completed) {
      await this.activityService.logChecklistItemCompleted(existing.caseId, userId, result.title);
    }

    if (input.title !== undefined && input.title !== existing.title) {
      await this.activityService.logChecklistItemRenamed(existing.caseId, userId, existing.title, result.title);
    }

    return result;
  }

  /**
   * Deletes a checklist item.
   */
  async deleteChecklistItem(id: string, userId: string, caseId?: string) {
    const existing = await this.getChecklistItemById(id, userId, caseId);
    this.logger.log({ id, userId }, 'Deleting checklist item');
    const result = await this.repository.delete(id, userId, caseId);
    await this.activityService.logChecklistItemDeleted(existing.caseId, userId, existing.title);
    return result;
  }
}
