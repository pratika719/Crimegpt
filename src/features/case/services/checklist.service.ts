import { checklistRepository } from "@/features/case/repositories/checklist.repository";
import { CreateChecklistItemSchema, CreateChecklistItemInput, UpdateChecklistItemSchema, UpdateChecklistItemInput } from "@/features/case/schemas/checklist.schema";
import { activityService } from "@/features/case/services/activity.service";
import { logger } from "@/lib/logger";

export class ChecklistService {
  private repository = checklistRepository;

  /**
   * Creates a new checklist item under a case.
   */
  async createChecklistItem(caseId: string, userId: string, input: Omit<CreateChecklistItemInput, "caseId">) {
    const parsed = CreateChecklistItemSchema.parse({
      ...input,
      caseId,
    });

    logger.info({ caseId, userId, title: parsed.title }, "[ChecklistService] Creating checklist item");
    return this.repository.create(caseId, userId, parsed.title);
  }

  /**
   * Retrieves a checklist item by ID.
   */
  async getChecklistItemById(id: string, userId: string, caseId?: string) {
    const item = await this.repository.findById(id, userId, caseId);
    if (!item) {
      throw new Error("Checklist item not found or access denied.");
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
  async updateChecklistItem(id: string, userId: string, input: UpdateChecklistItemInput, caseId?: string) {
    const parsed = UpdateChecklistItemSchema.parse(input);
    const existing = await this.getChecklistItemById(id, userId, caseId);

    // Prepare updated values
    const completed = parsed.completed;
    let completedAt = parsed.completedAt;

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
      ...parsed,
      completed,
      completedAt,
    };

    logger.info({ id, userId }, "[ChecklistService] Updating checklist item");
    const result = await this.repository.update(id, userId, updatedData, caseId);

    // If transitioned from false to true, log timeline activity
    if (completed && !existing.completed) {
      await activityService.logChecklistItemCompleted(existing.caseId, userId, result.title);
    }

    if (parsed.title !== undefined && parsed.title !== existing.title) {
      await activityService.logChecklistItemRenamed(existing.caseId, userId, existing.title, result.title);
    }

    return result;
  }

  /**
   * Deletes a checklist item.
   */
  async deleteChecklistItem(id: string, userId: string, caseId?: string) {
    const existing = await this.getChecklistItemById(id, userId, caseId);
    logger.info({ id, userId }, "[ChecklistService] Deleting checklist item");
    const result = await this.repository.delete(id, userId, caseId);
    await activityService.logChecklistItemDeleted(existing.caseId, userId, existing.title);
    return result;
  }
}

export const checklistService = new ChecklistService();
export default checklistService;
