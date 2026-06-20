import { prisma } from "@/lib/prisma";
import { UpdateChecklistItemInput } from "@/schema/checklist.schema";

export class ChecklistRepository {
  private async checkCaseOwnership(caseId: string, userId: string) {
    const c = await prisma.case.findFirst({
      where: { id: caseId, userId },
    });
    if (!c) {
      throw new Error("Unauthorized: Case not found or access denied.");
    }
  }

  async create(caseId: string, userId: string, title: string) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.checklistItem.create({
      data: {
        title,
        completed: false,
        caseId,
      },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.checklistItem.findFirst({
      where: {
        id,
        case: { userId },
      },
    });
  }

  async findByCaseId(caseId: string, userId: string) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.checklistItem.findMany({
      where: { caseId },
      orderBy: [
        { completed: "asc" }, // Incomplete (false) comes before completed (true)
        { createdAt: "desc" },
      ],
    });
  }

  async update(id: string, userId: string, data: UpdateChecklistItemInput) {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error("Unauthorized: Checklist item not found or access denied.");
    }

    return prisma.checklistItem.update({
      where: { id },
      data: {
        title: data.title,
        completed: data.completed,
        completedAt: data.completedAt,
      },
    });
  }

  async delete(id: string, userId: string) {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error("Unauthorized: Checklist item not found or access denied.");
    }

    return prisma.checklistItem.delete({
      where: { id },
    });
  }
}

export const checklistRepository = new ChecklistRepository();
export default checklistRepository;
