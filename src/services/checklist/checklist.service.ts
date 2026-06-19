import { checklistRepository } from "@/repositories/checklist.repository";
import { CreateChecklistItemSchema, CreateChecklistItemInput, UpdateChecklistItemSchema, UpdateChecklistItemInput } from "@/schema/checklist.schema";
import { activityService } from "@/services/activity/activity.service";

export class ChecklistService {
  private repository = checklistRepository;

  /**
   * Creates a new checklist item under a case.
   */
  async createChecklistItem(caseId: string, input: Omit<CreateChecklistItemInput, "caseId">) {
    const parsed = CreateChecklistItemSchema.parse({
      ...input,
      caseId,
    });

    console.log(`📋 [ChecklistService] Creating checklist item "${parsed.title}" for case: ${caseId}`);
    return this.repository.create(caseId, parsed.title);
  }

  /**
   * Retrieves a checklist item by ID.
   */
  async getChecklistItemById(id: string) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new Error("Checklist item not found.");
    }
    return item;
  }

  /**
   * Retrieves all checklist items for a case.
   */
  async getChecklistByCaseId(caseId: string) {
    return this.repository.findByCaseId(caseId);
  }

  /**
   * Updates a checklist item.
   * If toggled to completed=true, sets completedAt and logs activity.
   * If toggled to completed=false, nulls completedAt.
   */
  async updateChecklistItem(id: string, input: UpdateChecklistItemInput) {
    const parsed = UpdateChecklistItemSchema.parse(input);
    const existing = await this.getChecklistItemById(id);

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

    console.log(`📋 [ChecklistService] Updating checklist item ID: ${id}`);
    const result = await this.repository.update(id, updatedData);

    // If transitioned from false to true, log timeline activity
    if (completed && !existing.completed) {
      await activityService.logChecklistItemCompleted(existing.caseId, result.title);
    }

    return result;
  }

  /**
   * Deletes a checklist item.
   */
  async deleteChecklistItem(id: string) {
    const existing = await this.getChecklistItemById(id);
    console.log(`📋 [ChecklistService] Deleting checklist item ID: ${id}`);
    return this.repository.delete(id);
  }
}

export const checklistService = new ChecklistService();
export default checklistService;
