import { prisma } from "@/lib/prisma";
import { UpdateChecklistItemInput } from "@/schema/checklist.schema";

export class ChecklistRepository {
  async create(caseId: string, title: string) {
    return prisma.checklistItem.create({
      data: {
        title,
        completed: false,
        caseId,
      },
    });
  }

  async findById(id: string) {
    return prisma.checklistItem.findUnique({
      where: { id },
    });
  }

  async findByCaseId(caseId: string) {
    return prisma.checklistItem.findMany({
      where: { caseId },
      orderBy: [
        { completed: "asc" }, // Incomplete (false) comes before completed (true)
        { createdAt: "desc" },
      ],
    });
  }

  async update(id: string, data: UpdateChecklistItemInput) {
    return prisma.checklistItem.update({
      where: { id },
      data: {
        title: data.title,
        completed: data.completed,
        completedAt: data.completedAt,
      },
    });
  }

  async delete(id: string) {
    return prisma.checklistItem.delete({
      where: { id },
    });
  }
}

export const checklistRepository = new ChecklistRepository();
export default checklistRepository;
